package payment

import (
	"context"
	"errors"
)

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
	// Reset transitions a FAILED key back to PROCESSING for retry.
	Reset(ctx context.Context, key string) error
	Update(ctx context.Context, key string, state IdempotencyState) error
	Get(ctx context.Context, key string) (IdempotencyState, bool, error)
}
