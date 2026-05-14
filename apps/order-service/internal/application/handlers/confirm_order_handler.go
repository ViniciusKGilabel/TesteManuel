package handlers

import (
	"context"
	"fmt"
	"log"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
	"github.com/teste-manuel/order-service/internal/infrastructure/kafka"
)

type ConfirmOrderHandler struct {
	repo     order.Repository
	producer *kafka.Producer
}

func NewConfirmOrderHandler(repo order.Repository, producer *kafka.Producer) *ConfirmOrderHandler {
	return &ConfirmOrderHandler{repo: repo, producer: producer}
}

func (h *ConfirmOrderHandler) Handle(ctx context.Context, cmd commands.ConfirmOrder) error {
	o, err := h.repo.FindByID(ctx, cmd.OrderID)
	if err != nil {
		return fmt.Errorf("find order: %w", err)
	}

	if err := o.Confirm(); err != nil {
		return fmt.Errorf("confirm order: %w", err)
	}

	if err := h.repo.Save(ctx, o); err != nil {
		return fmt.Errorf("save order: %w", err)
	}

	if err := h.producer.PublishOrderConfirmed(ctx, o); err != nil {
		return fmt.Errorf("publish order.confirmed: %w", err)
	}

	if err := h.producer.PublishSagaState(ctx, o); err != nil {
		log.Printf("[saga-state] publish failed order=%s: %v", o.ID(), err)
	}

	return nil
}
