package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/teste-manuel/payment-service/internal/application/commands"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
	"github.com/teste-manuel/payment-service/internal/infrastructure/kafka"
	"github.com/teste-manuel/payment-service/internal/infrastructure/mock_provider"
)

type ProcessPaymentHandler struct {
	repo             payment.Repository
	idempotencyStore payment.IdempotencyStore
	provider         *mock_provider.Provider
	producer         *kafka.Producer
}

func NewProcessPaymentHandler(
	repo payment.Repository,
	store payment.IdempotencyStore,
	provider *mock_provider.Provider,
	producer *kafka.Producer,
) *ProcessPaymentHandler {
	return &ProcessPaymentHandler{
		repo:             repo,
		idempotencyStore: store,
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
			// FAILED → reset to PROCESSING so the retry holds the lock.
			// Per design: retry uses an incremented attempt number; the Reset
			// here re-arms the idempotency gate for this new attempt's key.
			if err := h.idempotencyStore.Reset(ctx, key); err != nil {
				return fmt.Errorf("reset idempotency key: %w", err)
			}
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
		if failErr := p.Fail(reason); failErr != nil {
			log.Printf("payment.Fail order=%s: %v", cmd.OrderID, failErr)
		}
		if saveErr := h.repo.Save(ctx, p); saveErr != nil {
			log.Printf("save failed payment order=%s: %v", cmd.OrderID, saveErr)
		}
		if updateErr := h.idempotencyStore.Update(ctx, key, payment.IdempotencyFailed); updateErr != nil {
			log.Printf("update idempotency key order=%s: %v", cmd.OrderID, updateErr)
		}
		if pubErr := h.producer.PublishPaymentFailed(ctx, p); pubErr != nil {
			return fmt.Errorf("publish payment.failed: %w", pubErr)
		}
		return fmt.Errorf("payment failed: %s", reason)
	}

	if err := p.Complete(); err != nil {
		return fmt.Errorf("complete payment: %w", err)
	}

	if err := h.repo.Save(ctx, p); err != nil {
		return fmt.Errorf("save completed payment: %w", err)
	}

	if err := h.idempotencyStore.Update(ctx, key, payment.IdempotencyCompleted); err != nil {
		return fmt.Errorf("update idempotency key: %w", err)
	}

	if err := h.producer.PublishPaymentProcessed(ctx, p); err != nil {
		return fmt.Errorf("publish payment.processed: %w", err)
	}

	return nil
}
