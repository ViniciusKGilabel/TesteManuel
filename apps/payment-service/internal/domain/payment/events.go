package payment

import "time"

// DomainEvent is the marker interface for all payment domain events.
type DomainEvent interface {
	OccurredAt() time.Time
	EventType() string
}

type PaymentProcessed struct {
	PaymentID  string
	OrderID    string
	occurredAt time.Time
}

func (e PaymentProcessed) OccurredAt() time.Time { return e.occurredAt }
func (e PaymentProcessed) EventType() string      { return "payment.processed" }

type PaymentFailed struct {
	PaymentID  string
	OrderID    string
	Reason     string
	occurredAt time.Time
}

func (e PaymentFailed) OccurredAt() time.Time { return e.occurredAt }
func (e PaymentFailed) EventType() string      { return "payment.failed" }
