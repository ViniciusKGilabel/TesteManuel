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

func TestNewPayment_Valid(t *testing.T) {
	p := validPayment(t)
	if p.Status() != payment.StatusPending {
		t.Errorf("expected PENDING, got %s", p.Status())
	}
	if p.AmountCents() != 5000 {
		t.Errorf("expected 5000, got %d", p.AmountCents())
	}
}

func TestNewPayment_EmptyID(t *testing.T) {
	if _, err := payment.NewPayment("", "ord-1", "user-1", "key", 100, "BRL"); err == nil {
		t.Error("expected error for empty id")
	}
}

func TestNewPayment_EmptyOrderID(t *testing.T) {
	if _, err := payment.NewPayment("pay-1", "", "user-1", "key", 100, "BRL"); err == nil {
		t.Error("expected error for empty orderID")
	}
}

func TestNewPayment_EmptyKey(t *testing.T) {
	if _, err := payment.NewPayment("pay-1", "ord-1", "user-1", "", 100, "BRL"); err == nil {
		t.Error("expected error for empty idempotency key")
	}
}

func TestNewPayment_ZeroAmount(t *testing.T) {
	if _, err := payment.NewPayment("pay-1", "ord-1", "user-1", "key", 0, "BRL"); err == nil {
		t.Error("expected error for zero amount")
	}
}

func TestPayment_Complete(t *testing.T) {
	p := validPayment(t)
	if err := p.Complete(); err != nil {
		t.Fatal(err)
	}
	if p.Status() != payment.StatusCompleted {
		t.Errorf("expected COMPLETED, got %s", p.Status())
	}
	if len(p.Events()) != 1 {
		t.Errorf("expected 1 event, got %d", len(p.Events()))
	}
}

func TestPayment_Fail(t *testing.T) {
	p := validPayment(t)
	if err := p.Fail("declined by issuer"); err != nil {
		t.Fatal(err)
	}
	if p.Status() != payment.StatusFailed {
		t.Errorf("expected FAILED, got %s", p.Status())
	}
	if p.FailureReason() != "declined by issuer" {
		t.Errorf("unexpected failure reason: %s", p.FailureReason())
	}
}

func TestPayment_CannotCompleteTwice(t *testing.T) {
	p := validPayment(t)
	_ = p.Complete()
	if err := p.Complete(); err == nil {
		t.Error("expected error completing an already COMPLETED payment")
	}
}

func TestPayment_CannotFailCompleted(t *testing.T) {
	p := validPayment(t)
	_ = p.Complete()
	if err := p.Fail("late failure"); err == nil {
		t.Error("expected error failing a COMPLETED payment")
	}
}

func TestIdempotencyKey_Deterministic(t *testing.T) {
	k1 := payment.IdempotencyKey("ord-1", 1)
	k2 := payment.IdempotencyKey("ord-1", 1)
	if k1 != k2 {
		t.Error("idempotency key should be deterministic")
	}
}

func TestIdempotencyKey_DifferentAttempts(t *testing.T) {
	k1 := payment.IdempotencyKey("ord-1", 1)
	k2 := payment.IdempotencyKey("ord-1", 2)
	if k1 == k2 {
		t.Error("different attempts should produce different keys")
	}
}

func TestIdempotencyKey_DifferentOrders(t *testing.T) {
	k1 := payment.IdempotencyKey("ord-1", 1)
	k2 := payment.IdempotencyKey("ord-2", 1)
	if k1 == k2 {
		t.Error("different order IDs should produce different keys")
	}
}
