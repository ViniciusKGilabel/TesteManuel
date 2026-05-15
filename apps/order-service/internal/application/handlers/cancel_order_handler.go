package handlers

import (
	"context"
	"fmt"
	"log"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type CancelOrderHandler struct {
	repo     order.Repository
	producer OrderEventPublisher
}

func NewCancelOrderHandler(repo order.Repository, producer OrderEventPublisher) *CancelOrderHandler {
	return &CancelOrderHandler{repo: repo, producer: producer}
}

func (h *CancelOrderHandler) Handle(ctx context.Context, cmd commands.CancelOrder) error {
	o, err := h.repo.FindByID(ctx, cmd.OrderID)
	if err != nil {
		return fmt.Errorf("find order: %w", err)
	}

	var needsRelease bool
	if o.Status() != order.StatusCancelled {
		needsRelease = o.RequiresStockRelease()
		if err := o.Cancel(cmd.Reason); err != nil {
			return fmt.Errorf("cancel order: %w", err)
		}
		if err := h.repo.Save(ctx, o); err != nil {
			return fmt.Errorf("save order: %w", err)
		}
	} else {
		// Already cancelled — infer whether stock was reserved from persisted state.
		needsRelease = o.FraudReport() != nil || o.PaymentAttempt() > 0
	}

	if err := h.producer.PublishOrderCancelled(ctx, o, cmd.Reason); err != nil {
		return fmt.Errorf("publish order.cancelled: %w", err)
	}

	if needsRelease {
		if err := h.producer.PublishStockReleaseRequested(ctx, o); err != nil {
			return fmt.Errorf("publish stock.release.requested: %w", err)
		}
	}

	if err := h.producer.PublishSagaState(ctx, o); err != nil {
		log.Printf("[saga-state] publish failed order=%s: %v", o.ID(), err)
	}

	return nil
}
