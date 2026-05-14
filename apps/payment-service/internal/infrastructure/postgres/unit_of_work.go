package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

type UnitOfWork struct {
	pool *pgxpool.Pool
}

func NewUnitOfWork(pool *pgxpool.Pool) *UnitOfWork {
	return &UnitOfWork{pool: pool}
}

// FailPayment updates the payment row to FAILED and the idempotency key to FAILED
// in a single transaction. If either write fails the transaction is rolled back and
// an error is returned — the caller must not publish payment.failed in that case.
func (u *UnitOfWork) FailPayment(ctx context.Context, p *payment.Payment, key string) error {
	tx, err := u.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, `
		INSERT INTO payments (id, order_id, user_id, amount_cents, currency, idempotency_key, status, failure_reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET
			status         = EXCLUDED.status,
			failure_reason = EXCLUDED.failure_reason,
			updated_at     = EXCLUDED.updated_at
	`,
		p.ID(), p.OrderID(), p.UserID(), p.AmountCents(), p.Currency(),
		p.IdempotencyKey(), string(p.Status()), p.FailureReason(),
		p.CreatedAt(), time.Now().UTC(),
	); err != nil {
		return fmt.Errorf("update payment: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE idempotency_keys SET state = $1, updated_at = NOW() WHERE key = $2
	`, string(payment.IdempotencyFailed), key); err != nil {
		return fmt.Errorf("update idempotency key: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
