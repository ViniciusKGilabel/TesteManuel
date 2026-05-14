package payment_test

import (
	"testing"

	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

func validPayment(t *testing.T) *payment.Payment {
	t.Helper()
	p, err := payment.NewPayment("pay-1", "ord-1", "user-1", "key-abc", 5000, "BRL")
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func TestNewPayment(t *testing.T) {
	t.Run("valid payment starts PENDING", func(t *testing.T) {
		p := validPayment(t)
		if p.Status() != payment.StatusPending {
			t.Errorf("status: want PENDING, got %s", p.Status())
		}
		if p.AmountCents() != 5000 {
			t.Errorf("amount: want 5000, got %d", p.AmountCents())
		}
	})

	invalidTests := []struct {
		name     string
		id       string
		orderID  string
		userID   string
		key      string
		amount   int64
		currency string
	}{
		{"empty id", "", "ord-1", "user-1", "key", 100, "BRL"},
		{"empty orderID", "pay-1", "", "user-1", "key", 100, "BRL"},
		{"empty key", "pay-1", "ord-1", "user-1", "", 100, "BRL"},
		{"zero amount", "pay-1", "ord-1", "user-1", "key", 0, "BRL"},
	}

	for _, tc := range invalidTests {
		t.Run(tc.name+" is rejected", func(t *testing.T) {
			if _, err := payment.NewPayment(tc.id, tc.orderID, tc.userID, tc.key, tc.amount, tc.currency); err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}

func TestPayment_StateTransitions(t *testing.T) {
	t.Run("Complete transitions to COMPLETED and emits one event", func(t *testing.T) {
		p := validPayment(t)
		if err := p.Complete(); err != nil {
			t.Fatal(err)
		}
		if p.Status() != payment.StatusCompleted {
			t.Errorf("want COMPLETED, got %s", p.Status())
		}
		if len(p.Events()) != 1 {
			t.Errorf("events: want 1, got %d", len(p.Events()))
		}
	})

	t.Run("Fail transitions to FAILED and stores reason", func(t *testing.T) {
		p := validPayment(t)
		if err := p.Fail("declined by issuer"); err != nil {
			t.Fatal(err)
		}
		if p.Status() != payment.StatusFailed {
			t.Errorf("want FAILED, got %s", p.Status())
		}
		if p.FailureReason() != "declined by issuer" {
			t.Errorf("failure reason: want 'declined by issuer', got %q", p.FailureReason())
		}
	})

	invalidTransitions := []struct {
		name  string
		setup func(*testing.T) (*payment.Payment, func() error)
	}{
		{
			name: "Complete twice fails",
			setup: func(t *testing.T) (*payment.Payment, func() error) {
				p := validPayment(t)
				_ = p.Complete()
				return p, p.Complete
			},
		},
		{
			name: "Fail after Complete fails",
			setup: func(t *testing.T) (*payment.Payment, func() error) {
				p := validPayment(t)
				_ = p.Complete()
				return p, func() error { return p.Fail("late failure") }
			},
		},
	}

	for _, tc := range invalidTransitions {
		t.Run(tc.name, func(t *testing.T) {
			_, fn := tc.setup(t)
			if err := fn(); err == nil {
				t.Fatal("expected error for invalid transition, got nil")
			}
		})
	}
}

func TestIdempotencyKey(t *testing.T) {
	t.Run("same inputs produce the same key", func(t *testing.T) {
		if payment.IdempotencyKey("ord-1", 1) != payment.IdempotencyKey("ord-1", 1) {
			t.Error("idempotency key is not deterministic")
		}
	})

	t.Run("different attempt numbers produce different keys", func(t *testing.T) {
		if payment.IdempotencyKey("ord-1", 1) == payment.IdempotencyKey("ord-1", 2) {
			t.Error("different attempts should produce different keys")
		}
	})

	t.Run("different order IDs produce different keys", func(t *testing.T) {
		if payment.IdempotencyKey("ord-1", 1) == payment.IdempotencyKey("ord-2", 1) {
			t.Error("different order IDs should produce different keys")
		}
	})
}
