package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/teste-manuel/payment-service/internal/application/commands"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

type ProcessPaymentHandler struct {
	repo             payment.Repository
	idempotencyStore payment.IdempotencyStore
	uow              payment.UnitOfWork
	provider         payment.PaymentProvider
	producer         PaymentEventPublisher
}

func NewProcessPaymentHandler(
	repo payment.Repository,
	store payment.IdempotencyStore,
	uow payment.UnitOfWork,
	provider payment.PaymentProvider,
	producer PaymentEventPublisher,
) *ProcessPaymentHandler {
	return &ProcessPaymentHandler{
		repo:             repo,
		idempotencyStore: store,
		uow:              uow,
		provider:         provider,
		producer:         producer,
	}
}

var ErrAlreadyProcessing = fmt.Errorf("payment already processing — retry later")

func (h *ProcessPaymentHandler) Handle(ctx context.Context, cmd commands.ProcessPayment) error {
	key := payment.IdempotencyKey(cmd.OrderID, cmd.Attempt)

	state, found, err := h.idempotencyStore.Get(ctx, key)
	if err != nil {
		return fmt.Errorf("idempotency check: %w", err)
	}

	if found {
		switch state {
		case payment.IdempotencyCompleted:
			return nil // already charged — safe no-op
		case payment.IdempotencyProcessing:
			return ErrAlreadyProcessing
		case payment.IdempotencyFailed:
			// FAILED is terminal for this attempt; payment.failed was already published.
			// The saga retries with attempt+1, which produces a new key (NOT_FOUND path).
			return nil
		}
	} else {
		if err := h.idempotencyStore.Insert(ctx, key); err != nil {
			if errors.Is(err, payment.ErrAlreadyInserted) {
				return ErrAlreadyProcessing // concurrent handler won the race
			}
			return fmt.Errorf("insert idempotency key: %w", err)
		}
	}

	p, err := payment.NewPayment(
		cmd.PaymentID,
		cmd.OrderID,
		cmd.UserID,
		key,
		cmd.AmountCents,
		cmd.Currency,
	)
	if err != nil {
		return fmt.Errorf("create payment: %w", err)
	}

	if err := h.repo.Save(ctx, p); err != nil {
		return fmt.Errorf("save payment: %w", err)
	}

	result, providerErr := h.provider.Process(ctx, cmd.OrderID, cmd.AmountCents)
	if providerErr != nil {
		log.Printf("payment provider error order=%s: %v", cmd.OrderID, providerErr)
		result.Declined = true
		result.Reason = providerErr.Error()
	}

	if result.Declined || !result.Captured {
		reason := result.Reason
		if reason == "" {
			reason = "payment declined"
		}
		if err := p.Fail(reason); err != nil {
			return fmt.Errorf("transition payment to failed: %w", err)
		}
		if err := h.uow.FailPayment(ctx, p, key); err != nil {
			return fmt.Errorf("persist payment failure: %w", err)
		}
		if err := h.producer.PublishPaymentFailed(ctx, p); err != nil {
			return fmt.Errorf("publish payment.failed: %w", err)
		}
		return fmt.Errorf("payment failed: %s", reason)
	}

	if err := p.Complete(); err != nil {
		return fmt.Errorf("complete payment: %w", err)
	}

	if err := h.uow.CompletePayment(ctx, p, key); err != nil {
		return fmt.Errorf("persist payment completion: %w", err)
	}

	if err := h.producer.PublishPaymentProcessed(ctx, p); err != nil {
		return fmt.Errorf("publish payment.processed: %w", err)
	}

	return nil
}
