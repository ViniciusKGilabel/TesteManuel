package handlers

import (
	"context"
	"fmt"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
	"github.com/teste-manuel/order-service/internal/infrastructure/fraud"
	"github.com/teste-manuel/order-service/internal/infrastructure/kafka"
)

type PlaceOrderHandler struct {
	repo        order.Repository
	fraudClient *fraud.Client
	producer    *kafka.Producer
}

func NewPlaceOrderHandler(repo order.Repository, fraudClient *fraud.Client, producer *kafka.Producer) *PlaceOrderHandler {
	return &PlaceOrderHandler{repo: repo, fraudClient: fraudClient, producer: producer}
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

	return o, nil
}
