package payment

import (
	"context"
	"errors"
)

// ProviderResult is the outcome of a single payment-provider charge attempt.
type ProviderResult struct {
	Authorized bool
	Captured   bool
	Declined   bool
	Reason     string
}

// PaymentProvider is the port for external payment gateway integration.
type PaymentProvider interface {
	Process(ctx context.Context, orderID string, amountCents int64) (ProviderResult, error)
}

// ErrAlreadyInserted is returned by IdempotencyStore.Insert when the key already
// exists with PROCESSING state, indicating a concurrent handler won the race.
var ErrAlreadyInserted = errors.New("idempotency key already locked")

type Repository interface {
	Save(ctx context.Context, p *Payment) error
	FindByID(ctx context.Context, id string) (*Payment, error)
	FindByIdempotencyKey(ctx context.Context, key string) (*Payment, error)
}

type IdempotencyState string

const (
	IdempotencyProcessing IdempotencyState = "PROCESSING"
	IdempotencyCompleted  IdempotencyState = "COMPLETED"
	IdempotencyFailed     IdempotencyState = "FAILED"
)

type IdempotencyStore interface {
	// Insert atomically creates a PROCESSING key. Returns ErrAlreadyInserted
	// when a concurrent caller won the race for the same key.
	Insert(ctx context.Context, key string) error
	Update(ctx context.Context, key string, state IdempotencyState) error
	Get(ctx context.Context, key string) (IdempotencyState, bool, error)
}

// UnitOfWork atomically persists a terminal payment state change together with
// the matching idempotency key update in a single database transaction.
// This prevents the saga from receiving payment.failed while the payment row
// or idempotency key are still in an intermediate state.
type UnitOfWork interface {
	FailPayment(ctx context.Context, p *Payment, key string) error
}
