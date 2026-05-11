package payment

import "time"

type PaymentProcessed struct {
	PaymentID string
	OrderID   string
	OccuredAt time.Time
}

type PaymentFailed struct {
	PaymentID string
	OrderID   string
	Reason    string
	OccuredAt time.Time
}
