package handlers_test

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/application/handlers"
	"github.com/teste-manuel/order-service/internal/application/queries"
	"github.com/teste-manuel/order-service/internal/domain/order"
	"github.com/teste-manuel/order-service/internal/infrastructure/kafka"
)

// --- in-memory test doubles ---

type inMemoryOrderRepo struct {
	mu      sync.RWMutex
	orders  map[string]*order.Order
	saveErr error
}

func newOrderRepo() *inMemoryOrderRepo {
	return &inMemoryOrderRepo{orders: make(map[string]*order.Order)}
}

func newFailingOrderRepo(err error) *inMemoryOrderRepo {
	return &inMemoryOrderRepo{orders: make(map[string]*order.Order), saveErr: err}
}

func (r *inMemoryOrderRepo) Save(_ context.Context, o *order.Order) error {
	if r.saveErr != nil {
		return r.saveErr
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.orders[o.ID()] = o
	return nil
}

func (r *inMemoryOrderRepo) FindByID(_ context.Context, id string) (*order.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if o, ok := r.orders[id]; ok {
		return o, nil
	}
	return nil, fmt.Errorf("order %s not found", id)
}

func (r *inMemoryOrderRepo) FindByUserID(_ context.Context, userID string) ([]*order.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*order.Order
	for _, o := range r.orders {
		if o.UserID() == userID {
			result = append(result, o)
		}
	}
	return result, nil
}

// --- helpers ---

func noopProducer(t *testing.T) *kafka.Producer {
	t.Helper()
	p, err := kafka.NewProducer("") // empty brokers → no-op mode; publish calls log and return nil
	if err != nil {
		t.Fatalf("producer: %v", err)
	}
	return p
}

func validItem() commands.OrderItemInput {
	return commands.OrderItemInput{
		ProductID:      "prod-1",
		Quantity:       2,
		UnitPriceCents: 500,
		Currency:       "BRL",
	}
}

func validPlaceCmd() commands.PlaceOrder {
	return commands.PlaceOrder{
		OrderID: "ord-1",
		UserID:  "user-1",
		Items:   []commands.OrderItemInput{validItem()},
	}
}

// --- PlaceOrderHandler tests ---

func TestPlaceOrderHandler_Success(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	o, err := h.Handle(context.Background(), validPlaceCmd())
	if err != nil {
		t.Fatalf("want nil error, got %v", err)
	}
	if o.ID() != "ord-1" {
		t.Errorf("order ID: want ord-1, got %s", o.ID())
	}
	if o.UserID() != "user-1" {
		t.Errorf("user ID: want user-1, got %s", o.UserID())
	}
	if o.Status() != order.StatusPending {
		t.Errorf("status: want PENDING, got %s", o.Status())
	}
	if len(o.Items()) != 1 {
		t.Errorf("items: want 1, got %d", len(o.Items()))
	}

	saved, err := repo.FindByID(context.Background(), "ord-1")
	if err != nil {
		t.Fatalf("order not persisted: %v", err)
	}
	if saved.Status() != order.StatusPending {
		t.Errorf("persisted status: want PENDING, got %s", saved.Status())
	}
}

func TestPlaceOrderHandler_InvalidItem_ZeroQuantity(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	cmd := validPlaceCmd()
	cmd.Items[0].Quantity = 0

	_, err := h.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("want error for zero quantity, got nil")
	}
	if !strings.Contains(err.Error(), "invalid item") {
		t.Errorf("error should mention 'invalid item', got: %v", err)
	}
	if len(repo.orders) != 0 {
		t.Error("repo must be untouched after item validation failure")
	}
}

func TestPlaceOrderHandler_InvalidItem_EmptyProductID(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	cmd := validPlaceCmd()
	cmd.Items[0].ProductID = ""

	_, err := h.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("want error for empty productID, got nil")
	}
	if !strings.Contains(err.Error(), "invalid item") {
		t.Errorf("error should mention 'invalid item', got: %v", err)
	}
}

func TestPlaceOrderHandler_EmptyItems(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	cmd := validPlaceCmd()
	cmd.Items = nil

	_, err := h.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("want error for empty items, got nil")
	}
	if !strings.Contains(err.Error(), "create order") {
		t.Errorf("error should mention 'create order', got: %v", err)
	}
}

func TestPlaceOrderHandler_MissingOrderID(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	cmd := validPlaceCmd()
	cmd.OrderID = ""

	_, err := h.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("want error for missing order ID, got nil")
	}
	if !strings.Contains(err.Error(), "create order") {
		t.Errorf("error should mention 'create order', got: %v", err)
	}
}

func TestPlaceOrderHandler_MissingUserID(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	cmd := validPlaceCmd()
	cmd.UserID = ""

	_, err := h.Handle(context.Background(), cmd)
	if err == nil {
		t.Fatal("want error for missing user ID, got nil")
	}
	if !strings.Contains(err.Error(), "create order") {
		t.Errorf("error should mention 'create order', got: %v", err)
	}
}

func TestPlaceOrderHandler_RepoSaveFailure(t *testing.T) {
	repoErr := errors.New("db unavailable")
	repo := newFailingOrderRepo(repoErr)
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	_, err := h.Handle(context.Background(), validPlaceCmd())
	if err == nil {
		t.Fatal("want error when repo fails, got nil")
	}
	if !strings.Contains(err.Error(), "save order") {
		t.Errorf("error should mention 'save order', got: %v", err)
	}
	if !errors.Is(err, repoErr) {
		t.Errorf("root cause should be wrapped repoErr, got: %v", err)
	}
}

func TestPlaceOrderHandler_MultipleItems(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewPlaceOrderHandler(repo, noopProducer(t))

	cmd := commands.PlaceOrder{
		OrderID: "ord-2",
		UserID:  "user-1",
		Items: []commands.OrderItemInput{
			{ProductID: "prod-1", Quantity: 1, UnitPriceCents: 1000, Currency: "BRL"},
			{ProductID: "prod-2", Quantity: 3, UnitPriceCents: 500, Currency: "BRL"},
		},
	}

	o, err := h.Handle(context.Background(), cmd)
	if err != nil {
		t.Fatalf("want nil error, got %v", err)
	}
	if len(o.Items()) != 2 {
		t.Errorf("items: want 2, got %d", len(o.Items()))
	}
	// total = 1*1000 + 3*500 = 2500 cents
	if o.Total().Amount() != 2500 {
		t.Errorf("total: want 2500 cents, got %d", o.Total().Amount())
	}
}

// --- GetOrderHandler tests ---

func TestGetOrderHandler_Found(t *testing.T) {
	repo := newOrderRepo()
	item, _ := order.NewOrderItem("prod-1", 1, 1000, "BRL")
	o, _ := order.NewOrder("ord-1", "user-1", []order.OrderItem{item})
	_ = repo.Save(context.Background(), o)

	h := handlers.NewGetOrderHandler(repo)
	got, err := h.Handle(context.Background(), queries.GetOrder{OrderID: "ord-1"})
	if err != nil {
		t.Fatalf("want nil error, got %v", err)
	}
	if got.ID() != "ord-1" {
		t.Errorf("want ord-1, got %s", got.ID())
	}
}

func TestGetOrderHandler_NotFound(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewGetOrderHandler(repo)

	_, err := h.Handle(context.Background(), queries.GetOrder{OrderID: "missing"})
	if err == nil {
		t.Fatal("want error for missing order, got nil")
	}
	if !strings.Contains(err.Error(), "find order") {
		t.Errorf("error should mention 'find order', got: %v", err)
	}
}

// --- GetOrdersByUserHandler tests ---

func TestGetOrdersByUserHandler_MultipleOrders(t *testing.T) {
	repo := newOrderRepo()
	for _, id := range []string{"ord-1", "ord-2"} {
		item, _ := order.NewOrderItem("prod-1", 1, 1000, "BRL")
		o, _ := order.NewOrder(id, "user-1", []order.OrderItem{item})
		_ = repo.Save(context.Background(), o)
	}
	// Different user — must not appear in results.
	item, _ := order.NewOrderItem("prod-1", 1, 1000, "BRL")
	other, _ := order.NewOrder("ord-3", "user-2", []order.OrderItem{item})
	_ = repo.Save(context.Background(), other)

	h := handlers.NewGetOrdersByUserHandler(repo)
	orders, err := h.Handle(context.Background(), queries.GetOrdersByUser{UserID: "user-1"})
	if err != nil {
		t.Fatalf("want nil error, got %v", err)
	}
	if len(orders) != 2 {
		t.Errorf("want 2 orders for user-1, got %d", len(orders))
	}
}

func TestGetOrdersByUserHandler_EmptyResult(t *testing.T) {
	repo := newOrderRepo()
	h := handlers.NewGetOrdersByUserHandler(repo)

	orders, err := h.Handle(context.Background(), queries.GetOrdersByUser{UserID: "no-such-user"})
	if err != nil {
		t.Fatalf("want nil error for empty result, got %v", err)
	}
	if len(orders) != 0 {
		t.Errorf("want 0 orders, got %d", len(orders))
	}
}
