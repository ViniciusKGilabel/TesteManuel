package order

import "time"

// DomainEvent is the marker interface for all order domain events.
type DomainEvent interface {
	OccurredAt() time.Time
	EventType() string
}

type OrderPlaced struct {
	OrderID    string
	UserID     string
	Items      []OrderItem
	Total      Money
	occurredAt time.Time
}

func (e OrderPlaced) OccurredAt() time.Time { return e.occurredAt }
func (e OrderPlaced) EventType() string      { return "order.placed" }

type OrderConfirmed struct {
	OrderID    string
	occurredAt time.Time
}

func (e OrderConfirmed) OccurredAt() time.Time { return e.occurredAt }
func (e OrderConfirmed) EventType() string      { return "order.confirmed" }

type OrderCancelled struct {
	OrderID    string
	Reason     string
	occurredAt time.Time
}

func (e OrderCancelled) OccurredAt() time.Time { return e.occurredAt }
func (e OrderCancelled) EventType() string      { return "order.cancelled" }
