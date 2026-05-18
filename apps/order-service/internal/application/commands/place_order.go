package commands

type OrderItemInput struct {
	ProductID      string
	Quantity       int
	UnitPriceCents int64
	Currency       string
}

type PlaceOrder struct {
	OrderID            string
	UserID             string
	Items              []OrderItemInput
	UserAccountAgeDays int
	CartToOrderSeconds int
	IsNewAddress       bool
}
