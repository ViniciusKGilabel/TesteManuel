package handlers

import (
	"context"
	"fmt"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
	"github.com/teste-manuel/order-service/internal/infrastructure/kafka"
)

type CancelOrderHandler struct {
	repo     order.Repository
	producer *kafka.Producer
}

func NewCancelOrderHandler(repo order.Repository, producer *kafka.Producer) *CancelOrderHandler {
	return &CancelOrderHandler{repo: repo, producer: producer}
}

func (h *CancelOrderHandler) Handle(ctx context.Context, cmd commands.CancelOrder) error {
	o, err := h.repo.FindByID(ctx, cmd.OrderID)
	if err != nil {
		return fmt.Errorf("find order: %w", err)
	}

	prevStatus := o.Status()

	if err := o.Cancel(cmd.Reason); err != nil {
		return fmt.Errorf("cancel order: %w", err)
	}

	if err := h.repo.Save(ctx, o); err != nil {
		return fmt.Errorf("save order: %w", err)
	}

	if err := h.producer.PublishOrderCancelled(ctx, o, cmd.Reason); err != nil {
		return fmt.Errorf("publish order.cancelled: %w", err)
	}

	// Release stock when cancelling after reservation has occurred
	if prevStatus != order.StatusPending {
		if err := h.producer.PublishStockReleaseRequested(ctx, o); err != nil {
			return fmt.Errorf("publish stock.release.requested: %w", err)
		}
	}

	return nil
}
