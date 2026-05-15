package handlers

import (
	"context"
	"fmt"
	"log"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type ConfirmOrderHandler struct {
	repo     order.Repository
	producer OrderEventPublisher
}

func NewConfirmOrderHandler(repo order.Repository, producer OrderEventPublisher) *ConfirmOrderHandler {
	return &ConfirmOrderHandler{repo: repo, producer: producer}
}

func (h *ConfirmOrderHandler) Handle(ctx context.Context, cmd commands.ConfirmOrder) error {
	o, err := h.repo.FindByID(ctx, cmd.OrderID)
	if err != nil {
		return fmt.Errorf("find order: %w", err)
	}

	// Idempotent on Kafka retry: if state was persisted but publish failed on a prior
	// attempt, skip the transition and re-publish the event.
	if o.Status() != order.StatusConfirmed {
		if err := o.Confirm(); err != nil {
			return fmt.Errorf("confirm order: %w", err)
		}
		if err := h.repo.Save(ctx, o); err != nil {
			return fmt.Errorf("save order: %w", err)
		}
	}

	if err := h.producer.PublishOrderConfirmed(ctx, o); err != nil {
		return fmt.Errorf("publish order.confirmed: %w", err)
	}

	if err := h.producer.PublishSagaState(ctx, o); err != nil {
		log.Printf("[saga-state] publish failed order=%s: %v", o.ID(), err)
	}

	return nil
}
