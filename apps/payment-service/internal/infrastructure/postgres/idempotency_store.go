package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

type IdempotencyStore struct {
	pool *pgxpool.Pool
}

func NewIdempotencyStore(pool *pgxpool.Pool) *IdempotencyStore {
	return &IdempotencyStore{pool: pool}
}

func (s *IdempotencyStore) Insert(ctx context.Context, key string) error {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO idempotency_keys (key, state, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO NOTHING
	`, key, string(payment.IdempotencyProcessing))
	if err != nil {
		return fmt.Errorf("insert idempotency key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return payment.ErrAlreadyInserted
	}
	return nil
}

func (s *IdempotencyStore) Update(ctx context.Context, key string, state payment.IdempotencyState) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE idempotency_keys SET state = $1, updated_at = NOW() WHERE key = $2
	`, string(state), key)
	return err
}

func (s *IdempotencyStore) Get(ctx context.Context, key string) (payment.IdempotencyState, bool, error) {
	row := s.pool.QueryRow(ctx, `SELECT state FROM idempotency_keys WHERE key = $1`, key)
	var state string
	if err := row.Scan(&state); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", false, nil
		}
		return "", false, fmt.Errorf("get idempotency key: %w", err)
	}
	return payment.IdempotencyState(state), true, nil
}

func (s *IdempotencyStore) RefreshStaleProcessingLock(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE idempotency_keys
		SET updated_at = NOW()
		WHERE key = $1
		  AND state = $2
		  AND updated_at < NOW() - $3::interval
	`, key, string(payment.IdempotencyProcessing), ttl.String())
	if err != nil {
		return false, fmt.Errorf("replace stale processing key: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}
