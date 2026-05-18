package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

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
			// Already charged. Re-publish payment.processed so the saga can progress
			// if the original publish was lost (e.g. broker restart between write and publish).
			if p, lookupErr := h.repo.FindByIdempotencyKey(ctx, key); lookupErr == nil && p != nil {
				if err := h.producer.PublishPaymentProcessed(ctx, p); err != nil {
					return fmt.Errorf("re-publish payment.processed: %w", err)
				}
			}
			return nil
		case payment.IdempotencyProcessing:
			replaced, err := h.idempotencyStore.RefreshStaleProcessingLock(ctx, key, 5*time.Minute)
			if err != nil {
				return fmt.Errorf("ttl check for stale processing key: %w", err)
			}
			if !replaced {
				return ErrAlreadyProcessing
			}
			// Stale PROCESSING entry was reset — fall through to re-process.
		case payment.IdempotencyFailed:
			// Re-publish payment.failed so the saga can react if it missed the first
			// delivery (e.g. consumer restart). The saga must be idempotent on this event.
			// If the payment record is missing (edge case), skip re-publish silently.
			if p, lookupErr := h.repo.FindByIdempotencyKey(ctx, key); lookupErr == nil && p != nil {
				if err := h.producer.PublishPaymentFailed(ctx, p); err != nil {
					return fmt.Errorf("re-publish payment.failed: %w", err)
				}
			}
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
		_ = h.idempotencyStore.Update(ctx, key, payment.IdempotencyFailed)
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
