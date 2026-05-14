package order

import (
	"errors"
	"time"
)

type Status string

const (
	StatusPending          Status = "PENDING"
	StatusStockReserved    Status = "STOCK_RESERVED"
	StatusFraudChecked     Status = "FRAUD_CHECKED"
	StatusPaymentRequested Status = "PAYMENT_REQUESTED"
	StatusConfirmed        Status = "CONFIRMED"
	StatusCancelled        Status = "CANCELLED"
)

type FraudReport struct {
	RiskScore            int     `json:"risk_score"`
	RiskLevel            string  `json:"risk_level"`
	Narrative            string  `json:"narrative"`
	RecommendedAction    string  `json:"recommended_action"`
	Confidence           float64 `json:"confidence"`
	ManualReviewRequired bool    `json:"manual_review_required"`
}

type Order struct {
	id             string
	userID         string
	items          []OrderItem
	total          Money
	status         Status
	fraudReport    *FraudReport
	paymentAttempt int
	createdAt      time.Time
	updatedAt      time.Time
	events         []interface{}
}

func NewOrder(id, userID string, items []OrderItem) (*Order, error) {
	if id == "" {
		return nil, errors.New("order id is required")
	}
	if userID == "" {
		return nil, errors.New("user id is required")
	}
	if len(items) == 0 {
		return nil, errors.New("order must have at least one item")
	}

	total, err := calculateTotal(items)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	o := &Order{
		id:        id,
		userID:    userID,
		items:     items,
		total:     total,
		status:    StatusPending,
		createdAt: now,
		updatedAt: now,
	}
	o.events = append(o.events, OrderPlaced{
		OrderID:   id,
		UserID:    userID,
		Items:     items,
		Total:     total,
		OccuredAt: now,
	})
	return o, nil
}

func (o *Order) ReserveStock() error {
	if o.status != StatusPending {
		return errors.New("can only reserve stock for PENDING orders")
	}
	o.status = StatusStockReserved
	o.updatedAt = time.Now().UTC()
	return nil
}

func (o *Order) ApplyFraudCheck(report FraudReport) error {
	if o.status != StatusStockReserved {
		return errors.New("can only apply fraud check after stock is reserved")
	}
	o.fraudReport = &report
	o.status = StatusFraudChecked
	o.updatedAt = time.Now().UTC()
	return nil
}

func (o *Order) RequestPayment() error {
	if o.status != StatusFraudChecked {
		return errors.New("can only request payment after fraud check")
	}
	o.paymentAttempt++
	o.status = StatusPaymentRequested
	o.updatedAt = time.Now().UTC()
	return nil
}

func (o *Order) Confirm() error {
	if o.status != StatusPaymentRequested {
		return errors.New("can only confirm PAYMENT_REQUESTED orders")
	}
	o.status = StatusConfirmed
	o.updatedAt = time.Now().UTC()
	o.events = append(o.events, OrderConfirmed{OrderID: o.id, OccuredAt: o.updatedAt})
	return nil
}

func (o *Order) Cancel(reason string) error {
	if o.status == StatusConfirmed || o.status == StatusCancelled {
		return errors.New("cannot cancel a confirmed or already cancelled order")
	}
	o.status = StatusCancelled
	o.updatedAt = time.Now().UTC()
	o.events = append(o.events, OrderCancelled{OrderID: o.id, Reason: reason, OccuredAt: o.updatedAt})
	return nil
}

func (o *Order) ID() string                { return o.id }
func (o *Order) UserID() string            { return o.userID }
func (o *Order) Items() []OrderItem        { return o.items }
func (o *Order) Total() Money              { return o.total }
func (o *Order) Status() Status            { return o.status }
func (o *Order) FraudReport() *FraudReport { return o.fraudReport }
func (o *Order) CreatedAt() time.Time      { return o.createdAt }
func (o *Order) UpdatedAt() time.Time      { return o.updatedAt }
func (o *Order) Events() []interface{}     { return o.events }
func (o *Order) ClearEvents()              { o.events = nil }
func (o *Order) PaymentAttempt() int       { return o.paymentAttempt }
func (o *Order) SetPaymentAttempt(attempt int) { o.paymentAttempt = attempt }

// RequiresStockRelease reports whether cancelling this order must also release reserved stock.
// Stock is reserved once the order moves past PENDING; it must be freed on cancellation.
func (o *Order) RequiresStockRelease() bool {
	return o.status == StatusStockReserved ||
		o.status == StatusFraudChecked ||
		o.status == StatusPaymentRequested
}

func calculateTotal(items []OrderItem) (Money, error) {
	if len(items) == 0 {
		return Money{}, errors.New("no items")
	}
	total, err := items[0].Subtotal()
	if err != nil {
		return Money{}, err
	}
	for _, item := range items[1:] {
		sub, err := item.Subtotal()
		if err != nil {
			return Money{}, err
		}
		t, err := total.Add(sub)
		if err != nil {
			return Money{}, err
		}
		total = t
	}
	return total, nil
}
