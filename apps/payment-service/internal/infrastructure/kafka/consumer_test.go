package kafka_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/teste-manuel/payment-service/internal/application/commands"
	"github.com/teste-manuel/payment-service/internal/infrastructure/kafka"
)

// stubProcessor captures the command passed to it and returns a configurable error.
type stubProcessor struct {
	received commands.ProcessPayment
	err      error
}

func (s *stubProcessor) Handle(_ context.Context, cmd commands.ProcessPayment) error {
	s.received = cmd
	return s.err
}

func payload(t *testing.T, v interface{}) []byte {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return data
}

func TestConsumer_Dispatch_ValidPayload(t *testing.T) {
	proc := &stubProcessor{}
	c := kafka.NewConsumer("", "test-group", proc)

	data := payload(t, map[string]interface{}{
		"order_id":    "ord-1",
		"user_id":     "user-1",
		"total_cents": 5000,
		"currency":    "BRL",
		"attempt":     2,
	})

	if err := c.Dispatch(context.Background(), data); err != nil {
		t.Fatalf("want nil, got %v", err)
	}
	if proc.received.OrderID != "ord-1" {
		t.Errorf("order_id: want ord-1, got %s", proc.received.OrderID)
	}
	if proc.received.UserID != "user-1" {
		t.Errorf("user_id: want user-1, got %s", proc.received.UserID)
	}
	if proc.received.AmountCents != 5000 {
		t.Errorf("amount_cents: want 5000, got %d", proc.received.AmountCents)
	}
	if proc.received.Currency != "BRL" {
		t.Errorf("currency: want BRL, got %s", proc.received.Currency)
	}
	if proc.received.Attempt != 2 {
		t.Errorf("attempt: want 2, got %d", proc.received.Attempt)
	}
	if proc.received.PaymentID == "" {
		t.Error("payment_id should be generated UUID, got empty")
	}
}

func TestConsumer_Dispatch_ZeroAttemptDefaultsToOne(t *testing.T) {
	proc := &stubProcessor{}
	c := kafka.NewConsumer("", "test-group", proc)

	data := payload(t, map[string]interface{}{
		"order_id":    "ord-2",
		"user_id":     "user-1",
		"total_cents": 1000,
		"currency":    "BRL",
		"attempt":     0,
	})

	if err := c.Dispatch(context.Background(), data); err != nil {
		t.Fatalf("want nil, got %v", err)
	}
	if proc.received.Attempt != 1 {
		t.Errorf("attempt: want 1 (default), got %d", proc.received.Attempt)
	}
}

func TestConsumer_Dispatch_InvalidJSON(t *testing.T) {
	proc := &stubProcessor{}
	c := kafka.NewConsumer("", "test-group", proc)

	err := c.Dispatch(context.Background(), []byte("not-json"))
	if err == nil {
		t.Fatal("want error for invalid JSON, got nil")
	}
}

func TestConsumer_Dispatch_HandlerError_Propagates(t *testing.T) {
	handlerErr := errors.New("handler failed")
	proc := &stubProcessor{err: handlerErr}
	c := kafka.NewConsumer("", "test-group", proc)

	data := payload(t, map[string]interface{}{
		"order_id":    "ord-3",
		"user_id":     "user-1",
		"total_cents": 2000,
		"currency":    "BRL",
		"attempt":     1,
	})

	err := c.Dispatch(context.Background(), data)
	if !errors.Is(err, handlerErr) {
		t.Errorf("want wrapped handlerErr, got %v", err)
	}
}
