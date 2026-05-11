package order

import "time"

type OrderPlaced struct {
	OrderID   string
	UserID    string
	Items     []OrderItem
	Total     Money
	OccuredAt time.Time
}

type OrderConfirmed struct {
	OrderID   string
	OccuredAt time.Time
}

type OrderCancelled struct {
	OrderID   string
	Reason    string
	OccuredAt time.Time
}
