package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type OrderRepository struct {
	pool *pgxpool.Pool
}

func NewOrderRepository(pool *pgxpool.Pool) *OrderRepository {
	return &OrderRepository{pool: pool}
}

func (r *OrderRepository) Save(ctx context.Context, o *order.Order) error {
	itemsJSON, err := marshalItems(o.Items())
	if err != nil {
		return fmt.Errorf("marshal items: %w", err)
	}

	var fraudJSON []byte
	if fr := o.FraudReport(); fr != nil {
		fraudJSON, err = json.Marshal(fr)
		if err != nil {
			return fmt.Errorf("marshal fraud report: %w", err)
		}
	}

	_, err = r.pool.Exec(ctx, `
		INSERT INTO orders (id, user_id, items, total_cents, currency, status, fraud_report, payment_attempt, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET
			status          = EXCLUDED.status,
			fraud_report    = EXCLUDED.fraud_report,
			payment_attempt = EXCLUDED.payment_attempt,
			updated_at      = EXCLUDED.updated_at
	`,
		o.ID(),
		o.UserID(),
		itemsJSON,
		o.Total().Amount(),
		o.Total().Currency(),
		string(o.Status()),
		fraudJSON,
		o.PaymentAttempt(),
		o.CreatedAt(),
		o.UpdatedAt(),
	)
	if err != nil {
		return fmt.Errorf("save order: %w", err)
	}
	return nil
}

func (r *OrderRepository) FindByID(ctx context.Context, id string) (*order.Order, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, items, total_cents, currency, status, fraud_report, payment_attempt, created_at, updated_at
		FROM orders WHERE id = $1
	`, id)

	return scanOrder(row)
}

func (r *OrderRepository) FindByUserID(ctx context.Context, userID string) ([]*order.Order, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, items, total_cents, currency, status, fraud_report, payment_attempt, created_at, updated_at
		FROM orders WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []*order.Order
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

type itemRow struct {
	ProductID      string `json:"product_id"`
	Quantity       int    `json:"quantity"`
	UnitPriceCents int64  `json:"unit_price_cents"`
	Currency       string `json:"currency"`
}

func scanOrder(row rowScanner) (*order.Order, error) {
	var (
		id, userID, status, currency string
		totalCents                   int64
		itemsJSON                    []byte
		fraudJSON                    []byte
		paymentAttempt               int
		createdAt, updatedAt         time.Time
	)

	if err := row.Scan(&id, &userID, &itemsJSON, &totalCents, &currency, &status, &fraudJSON, &paymentAttempt, &createdAt, &updatedAt); err != nil {
		return nil, fmt.Errorf("scan order: %w", err)
	}

	var rows []itemRow
	if err := json.Unmarshal(itemsJSON, &rows); err != nil {
		return nil, fmt.Errorf("unmarshal items: %w", err)
	}

	items := make([]order.OrderItem, 0, len(rows))
	for _, r := range rows {
		item, err := order.NewOrderItem(r.ProductID, r.Quantity, r.UnitPriceCents, r.Currency)
		if err != nil {
			return nil, fmt.Errorf("reconstruct item: %w", err)
		}
		items = append(items, item)
	}

	o, err := order.NewOrder(id, userID, items)
	if err != nil {
		return nil, fmt.Errorf("reconstruct order: %w", err)
	}

	var realFraud *order.FraudReport
	if len(fraudJSON) > 0 {
		var fr order.FraudReport
		if err := json.Unmarshal(fraudJSON, &fr); err != nil {
			return nil, fmt.Errorf("unmarshal fraud report: %w", err)
		}
		realFraud = &fr
	}

	if err := advanceToStatus(o, order.Status(status), realFraud); err != nil {
		return nil, err
	}

	o.SetPaymentAttempt(paymentAttempt)
	o.ClearEvents()

	return o, nil
}

func advanceToStatus(o *order.Order, target order.Status, fraud *order.FraudReport) error {
	if target == order.StatusPending || o.Status() == target {
		return nil
	}
	if target == order.StatusCancelled {
		return o.Cancel("restored from DB")
	}

	fraudForReplay := order.FraudReport{RecommendedAction: "APPROVE"}
	if fraud != nil {
		fraudForReplay = *fraud
	}

	steps := []struct {
		to order.Status
		fn func() error
	}{
		{order.StatusStockReserved, o.ReserveStock},
		{order.StatusFraudChecked, func() error {
			return o.ApplyFraudCheck(fraudForReplay)
		}},
		{order.StatusPaymentRequested, o.RequestPayment},
		{order.StatusConfirmed, o.Confirm},
	}

	for _, step := range steps {
		if o.Status() == target {
			break
		}
		if err := step.fn(); err != nil {
			return fmt.Errorf("advance to %s: %w", step.to, err)
		}
	}

	if o.Status() != target {
		return fmt.Errorf("could not advance order to status %s: stuck at %s", target, o.Status())
	}
	return nil
}

func marshalItems(items []order.OrderItem) ([]byte, error) {
	rows := make([]itemRow, 0, len(items))
	for _, item := range items {
		rows = append(rows, itemRow{
			ProductID:      item.ProductID(),
			Quantity:       item.Quantity(),
			UnitPriceCents: item.UnitPrice().Amount(),
			Currency:       item.UnitPrice().Currency(),
		})
	}
	return json.Marshal(rows)
}

var ErrNotFound = errors.New("order not found")
