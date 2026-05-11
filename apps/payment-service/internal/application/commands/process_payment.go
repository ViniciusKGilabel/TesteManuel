package commands

type ProcessPayment struct {
	PaymentID   string
	OrderID     string
	UserID      string
	AmountCents int64
	Currency    string
	Attempt     int
}
