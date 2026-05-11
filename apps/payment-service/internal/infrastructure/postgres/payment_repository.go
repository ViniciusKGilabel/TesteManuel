package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

type PaymentRepository struct {
	pool *pgxpool.Pool
}

func NewPaymentRepository(pool *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{pool: pool}
}

func (r *PaymentRepository) Save(ctx context.Context, p *payment.Payment) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO payments (id, order_id, user_id, amount_cents, currency, idempotency_key, status, failure_reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status,
			failure_reason = EXCLUDED.failure_reason,
			updated_at = EXCLUDED.updated_at
	`,
		p.ID(), p.OrderID(), p.UserID(), p.AmountCents(), p.Currency(),
		p.IdempotencyKey(), string(p.Status()), p.FailureReason(),
		p.CreatedAt(), time.Now().UTC(),
	)
	return err
}

func (r *PaymentRepository) FindByID(ctx context.Context, id string) (*payment.Payment, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, order_id, user_id, amount_cents, currency, idempotency_key, status, failure_reason, created_at
		FROM payments WHERE id = $1
	`, id)
	return scanPayment(row)
}

func (r *PaymentRepository) FindByIdempotencyKey(ctx context.Context, key string) (*payment.Payment, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, order_id, user_id, amount_cents, currency, idempotency_key, status, failure_reason, created_at
		FROM payments WHERE idempotency_key = $1
	`, key)
	return scanPayment(row)
}

func scanPayment(row interface{ Scan(dest ...interface{}) error }) (*payment.Payment, error) {
	var pid, orderID, userID, currency, key, statusStr, failureReason string
	var amountCents int64
	var createdAt time.Time
	if err := row.Scan(&pid, &orderID, &userID, &amountCents, &currency, &key, &statusStr, &failureReason, &createdAt); err != nil {
		return nil, fmt.Errorf("scan payment: %w", err)
	}
	return payment.Reconstitute(pid, orderID, userID, key, currency, amountCents, payment.Status(statusStr), failureReason, createdAt)
}
