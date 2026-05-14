package handlers

import (
	"context"
	"fmt"
	"log"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type PlaceOrderHandler struct {
	repo     order.Repository
	producer OrderEventPublisher
}

func NewPlaceOrderHandler(repo order.Repository, producer OrderEventPublisher) *PlaceOrderHandler {
	return &PlaceOrderHandler{repo: repo, producer: producer}
}

func (h *PlaceOrderHandler) Handle(ctx context.Context, cmd commands.PlaceOrder) (*order.Order, error) {
	items := make([]order.OrderItem, 0, len(cmd.Items))
	for _, i := range cmd.Items {
		item, err := order.NewOrderItem(i.ProductID, i.Quantity, i.UnitPriceCents, i.Currency)
		if err != nil {
			return nil, fmt.Errorf("invalid item: %w", err)
		}
		items = append(items, item)
	}

	o, err := order.NewOrder(cmd.OrderID, cmd.UserID, items)
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}

	if err := h.repo.Save(ctx, o); err != nil {
		return nil, fmt.Errorf("save order: %w", err)
	}

	if err := h.producer.PublishOrderPlaced(ctx, o); err != nil {
		return nil, fmt.Errorf("publish order.placed: %w", err)
	}

	if err := h.producer.PublishSagaState(ctx, o); err != nil {
		log.Printf("[saga-state] publish failed order=%s: %v", o.ID(), err)
	}

	return o, nil
}
