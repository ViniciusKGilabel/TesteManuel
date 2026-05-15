package kafka_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/teste-manuel/order-service/internal/application/handlers"
	"github.com/teste-manuel/order-service/internal/domain/order"
	"github.com/teste-manuel/order-service/internal/infrastructure/fraud"
	"github.com/teste-manuel/order-service/internal/infrastructure/kafka"
)

// inMemoryRepo is a thread-safe in-memory implementation of order.Repository for tests.
type inMemoryRepo struct {
	mu     sync.RWMutex
	orders map[string]*order.Order
}

func newInMemoryRepo() *inMemoryRepo {
	return &inMemoryRepo{orders: make(map[string]*order.Order)}
}

func (r *inMemoryRepo) Save(_ context.Context, o *order.Order) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.orders[o.ID()] = o
	return nil
}

func (r *inMemoryRepo) FindByID(_ context.Context, id string) (*order.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	o, ok := r.orders[id]
	if !ok {
		return nil, fmt.Errorf("order %s not found", id)
	}
	return o, nil
}

func (r *inMemoryRepo) FindByUserID(_ context.Context, userID string) ([]*order.Order, error) {
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

// fraudServer starts a test HTTP server that returns an approved low-risk fraud response.
func fraudServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"risk_score":         5,
			"risk_level":         "LOW",
			"narrative":          "no signals",
			"recommended_action": "APPROVE",
			"signals_flagged":    []string{},
			"confidence":         0.99,
		})
	}))
}

// pendingOrder creates a new PENDING order and saves it to repo.
func pendingOrder(t *testing.T, repo *inMemoryRepo, id string) {
	t.Helper()
	item, err := order.NewOrderItem("prod-1", 1, 1000, "BRL")
	if err != nil {
		t.Fatal(err)
	}
	o, err := order.NewOrder(id, "user-1", []order.OrderItem{item})
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.Save(context.Background(), o); err != nil {
		t.Fatal(err)
	}
}

// paymentRequestedOrder creates an order in PAYMENT_REQUESTED state and saves it to repo.
func paymentRequestedOrder(t *testing.T, repo *inMemoryRepo, id string) {
	t.Helper()
	item, err := order.NewOrderItem("prod-1", 1, 1000, "BRL")
	if err != nil {
		t.Fatal(err)
	}
	o, err := order.NewOrder(id, "user-1", []order.OrderItem{item})
	if err != nil {
		t.Fatal(err)
	}
	_ = o.ReserveStock()
	_ = o.ApplyFraudCheck(order.FraudReport{RiskLevel: "LOW", RecommendedAction: "APPROVE"})
	_ = o.RequestPayment()
	if err := repo.Save(context.Background(), o); err != nil {
		t.Fatal(err)
	}
}

// buildConsumer wires up a Consumer with all handlers using in-memory deps.
func buildConsumer(t *testing.T, repo *inMemoryRepo, fraudURL string) *kafka.Consumer {
	t.Helper()
	producer, err := kafka.NewProducer("") // empty brokers → no-op mode; publish calls log and return nil
	if err != nil {
		t.Fatalf("producer: %v", err)
	}
	fraudClient := fraud.NewClient(fraudURL)
	confirmHandler := handlers.NewConfirmOrderHandler(repo, producer)
	cancelHandler := handlers.NewCancelOrderHandler(repo, producer)
	stockReservedHandler := handlers.NewStockReservedHandler(repo, fraudClient, producer)
	return kafka.NewConsumer("", "test-group", confirmHandler, cancelHandler, stockReservedHandler)
}

func event(t *testing.T, eventType string, payload map[string]interface{}) []byte {
	t.Helper()
	data, err := json.Marshal(map[string]interface{}{
		"event_type": eventType,
		"payload":    payload,
	})
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func TestConsumer_Dispatch(t *testing.T) {
	srv := fraudServer(t)
	defer srv.Close()

	t.Run("stock.reserved routes to StockReservedHandler and advances to PAYMENT_REQUESTED", func(t *testing.T) {
		repo := newInMemoryRepo()
		pendingOrder(t, repo, "ord-1")
		c := buildConsumer(t, repo, srv.URL)

		data := event(t, "stock.reserved", map[string]interface{}{"order_id": "ord-1"})
		if err := c.Dispatch(context.Background(), "stock.reserved", data); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		o, _ := repo.FindByID(context.Background(), "ord-1")
		if o.Status() != order.StatusPaymentRequested {
			t.Errorf("want PAYMENT_REQUESTED, got %s", o.Status())
		}
	})

	t.Run("payment.processed routes to ConfirmOrderHandler and advances to CONFIRMED", func(t *testing.T) {
		repo := newInMemoryRepo()
		paymentRequestedOrder(t, repo, "ord-2")
		c := buildConsumer(t, repo, srv.URL)

		data := event(t, "payment.processed", map[string]interface{}{"order_id": "ord-2"})
		if err := c.Dispatch(context.Background(), "payment.processed", data); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		o, _ := repo.FindByID(context.Background(), "ord-2")
		if o.Status() != order.StatusConfirmed {
			t.Errorf("want CONFIRMED, got %s", o.Status())
		}
	})

	t.Run("payment.failed routes to CancelOrderHandler and cancels order", func(t *testing.T) {
		repo := newInMemoryRepo()
		paymentRequestedOrder(t, repo, "ord-3")
		c := buildConsumer(t, repo, srv.URL)

		data := event(t, "payment.failed", map[string]interface{}{"order_id": "ord-3", "reason": "insufficient funds"})
		if err := c.Dispatch(context.Background(), "payment.failed", data); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		o, _ := repo.FindByID(context.Background(), "ord-3")
		if o.Status() != order.StatusCancelled {
			t.Errorf("want CANCELLED, got %s", o.Status())
		}
	})

	t.Run("stock.reservation.failed routes to CancelOrderHandler and cancels order", func(t *testing.T) {
		repo := newInMemoryRepo()
		pendingOrder(t, repo, "ord-4")
		c := buildConsumer(t, repo, srv.URL)

		data := event(t, "stock.reservation.failed", map[string]interface{}{"order_id": "ord-4", "reason": "out of stock"})
		if err := c.Dispatch(context.Background(), "stock.reservation.failed", data); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		o, _ := repo.FindByID(context.Background(), "ord-4")
		if o.Status() != order.StatusCancelled {
			t.Errorf("want CANCELLED, got %s", o.Status())
		}
	})

	t.Run("unknown topic is a no-op", func(t *testing.T) {
		repo := newInMemoryRepo()
		c := buildConsumer(t, repo, srv.URL)

		data := event(t, "unknown.event", map[string]interface{}{"order_id": "ord-5"})
		if err := c.Dispatch(context.Background(), "unknown.topic", data); err != nil {
			t.Fatalf("expected nil for unknown topic, got: %v", err)
		}
	})

	t.Run("malformed JSON returns error", func(t *testing.T) {
		repo := newInMemoryRepo()
		c := buildConsumer(t, repo, srv.URL)

		if err := c.Dispatch(context.Background(), "payment.processed", []byte("not-json")); err == nil {
			t.Error("expected error for malformed JSON, got nil")
		}
	})
}

// TestConsumer_Dispatch_FraudUnavailable verifies that a 5xx fraud response returns an error
// and leaves the order in STOCK_RESERVED so the Kafka offset is not committed and the
// message is retried.
func TestConsumer_Dispatch_FraudUnavailable(t *testing.T) {
	unavailableSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer unavailableSrv.Close()

	repo := newInMemoryRepo()
	pendingOrder(t, repo, "ord-fraud-down")
	c := buildConsumer(t, repo, unavailableSrv.URL)

	data := event(t, "stock.reserved", map[string]interface{}{"order_id": "ord-fraud-down"})
	if err := c.Dispatch(context.Background(), "stock.reserved", data); err == nil {
		t.Fatal("fraud unavailable: want error, got nil")
	}

	o, err := repo.FindByID(context.Background(), "ord-fraud-down")
	if err != nil {
		t.Fatalf("order not found: %v", err)
	}
	if o.Status() != order.StatusStockReserved {
		t.Errorf("fraud unavailable: want STOCK_RESERVED, got %s", o.Status())
	}
}

// TestConsumer_Dispatch_FraudUnavailable_RetrySucceeds verifies that after a failed fraud call
// the message can be retried and succeeds because the handler is idempotent on STOCK_RESERVED.
func TestConsumer_Dispatch_FraudUnavailable_RetrySucceeds(t *testing.T) {
	callCount := 0
	var mu sync.Mutex
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		n := callCount
		callCount++
		mu.Unlock()

		if n == 0 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"risk_score":         5,
			"risk_level":         "LOW",
			"narrative":          "no signals",
			"recommended_action": "APPROVE",
			"signals_flagged":    []string{},
			"confidence":         0.99,
		})
	}))
	defer srv.Close()

	repo := newInMemoryRepo()
	pendingOrder(t, repo, "ord-retry")
	c := buildConsumer(t, repo, srv.URL)
	data := event(t, "stock.reserved", map[string]interface{}{"order_id": "ord-retry"})

	if err := c.Dispatch(context.Background(), "stock.reserved", data); err == nil {
		t.Fatal("first attempt: want error, got nil")
	}

	if err := c.Dispatch(context.Background(), "stock.reserved", data); err != nil {
		t.Fatalf("retry: want nil, got %v", err)
	}

	o, _ := repo.FindByID(context.Background(), "ord-retry")
	if o.Status() != order.StatusPaymentRequested {
		t.Errorf("after retry: want PAYMENT_REQUESTED, got %s", o.Status())
	}
}

// TestConsumer_Dispatch_FraudRejected verifies HIGH-risk fraud triggers cancellation.
func TestConsumer_Dispatch_FraudRejected(t *testing.T) {
	highRiskSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"risk_score":         80,
			"risk_level":         "HIGH",
			"narrative":          "suspicious activity",
			"recommended_action": "REJECT",
			"signals_flagged":    []string{"high_velocity"},
			"confidence":         0.95,
		})
	}))
	defer highRiskSrv.Close()

	repo := newInMemoryRepo()
	pendingOrder(t, repo, "ord-fraud")
	c := buildConsumer(t, repo, highRiskSrv.URL)

	data := event(t, "stock.reserved", map[string]interface{}{"order_id": "ord-fraud"})
	if err := c.Dispatch(context.Background(), "stock.reserved", data); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	o, _ := repo.FindByID(context.Background(), "ord-fraud")
	if o.Status() != order.StatusCancelled {
		t.Errorf("HIGH fraud risk: want CANCELLED, got %s", o.Status())
	}
}
