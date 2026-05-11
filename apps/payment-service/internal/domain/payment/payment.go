package payment

import (
	"errors"
	"time"
)

type Status string

const (
	StatusPending   Status = "PENDING"
	StatusCompleted Status = "COMPLETED"
	StatusFailed    Status = "FAILED"
)

type Payment struct {
	id             string
	orderID        string
	userID         string
	amountCents    int64
	currency       string
	idempotencyKey string
	status         Status
	failureReason  string
	createdAt      time.Time
	updatedAt      time.Time
	events         []interface{}
}

func NewPayment(id, orderID, userID, idempotencyKey string, amountCents int64, currency string) (*Payment, error) {
	if id == "" {
		return nil, errors.New("payment id is required")
	}
	if orderID == "" {
		return nil, errors.New("order id is required")
	}
	if idempotencyKey == "" {
		return nil, errors.New("idempotency key is required")
	}
	if amountCents <= 0 {
		return nil, errors.New("amount must be positive")
	}
	now := time.Now().UTC()
	return &Payment{
		id:             id,
		orderID:        orderID,
		userID:         userID,
		amountCents:    amountCents,
		currency:       currency,
		idempotencyKey: idempotencyKey,
		status:         StatusPending,
		createdAt:      now,
		updatedAt:      now,
	}, nil
}

func (p *Payment) Complete() error {
	if p.status != StatusPending {
		return errors.New("can only complete a PENDING payment")
	}
	p.status = StatusCompleted
	p.updatedAt = time.Now().UTC()
	p.events = append(p.events, PaymentProcessed{
		PaymentID: p.id,
		OrderID:   p.orderID,
		OccuredAt: p.updatedAt,
	})
	return nil
}

func (p *Payment) Fail(reason string) error {
	if p.status != StatusPending {
		return errors.New("can only fail a PENDING payment")
	}
	p.status = StatusFailed
	p.failureReason = reason
	p.updatedAt = time.Now().UTC()
	p.events = append(p.events, PaymentFailed{
		PaymentID: p.id,
		OrderID:   p.orderID,
		Reason:    reason,
		OccuredAt: p.updatedAt,
	})
	return nil
}

// Reconstitute rebuilds a Payment from persisted state, bypassing state-machine guards.
func Reconstitute(id, orderID, userID, idempotencyKey, currency string, amountCents int64, status Status, failureReason string, createdAt time.Time) (*Payment, error) {
	p, err := NewPayment(id, orderID, userID, idempotencyKey, amountCents, currency)
	if err != nil {
		return nil, err
	}
	p.status = status
	p.failureReason = failureReason
	p.createdAt = createdAt
	return p, nil
}

func (p *Payment) ID() string             { return p.id }
func (p *Payment) OrderID() string        { return p.orderID }
func (p *Payment) UserID() string         { return p.userID }
func (p *Payment) AmountCents() int64     { return p.amountCents }
func (p *Payment) Currency() string       { return p.currency }
func (p *Payment) IdempotencyKey() string { return p.idempotencyKey }
func (p *Payment) Status() Status         { return p.status }
func (p *Payment) FailureReason() string  { return p.failureReason }
func (p *Payment) CreatedAt() time.Time   { return p.createdAt }
func (p *Payment) Events() []interface{}  { return p.events }
func (p *Payment) ClearEvents()           { p.events = nil }
