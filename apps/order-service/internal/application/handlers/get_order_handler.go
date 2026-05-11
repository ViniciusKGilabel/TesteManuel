package handlers

import (
	"context"
	"fmt"

	"github.com/teste-manuel/order-service/internal/application/queries"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type GetOrderHandler struct {
	repo order.Repository
}

func NewGetOrderHandler(repo order.Repository) *GetOrderHandler {
	return &GetOrderHandler{repo: repo}
}

func (h *GetOrderHandler) Handle(ctx context.Context, q queries.GetOrder) (*order.Order, error) {
	o, err := h.repo.FindByID(ctx, q.OrderID)
	if err != nil {
		return nil, fmt.Errorf("find order: %w", err)
	}
	return o, nil
}

type GetOrdersByUserHandler struct {
	repo order.Repository
}

func NewGetOrdersByUserHandler(repo order.Repository) *GetOrdersByUserHandler {
	return &GetOrdersByUserHandler{repo: repo}
}

func (h *GetOrdersByUserHandler) Handle(ctx context.Context, q queries.GetOrdersByUser) ([]*order.Order, error) {
	orders, err := h.repo.FindByUserID(ctx, q.UserID)
	if err != nil {
		return nil, fmt.Errorf("find orders by user: %w", err)
	}
	return orders, nil
}
