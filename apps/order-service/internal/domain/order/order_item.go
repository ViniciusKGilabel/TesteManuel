package order

import "errors"

type OrderItem struct {
	productID string
	quantity  int
	unitPrice Money
}

func NewOrderItem(productID string, quantity int, unitPriceCents int64, currency string) (OrderItem, error) {
	if productID == "" {
		return OrderItem{}, errors.New("productID is required")
	}
	if quantity <= 0 {
		return OrderItem{}, errors.New("quantity must be positive")
	}
	price, err := NewMoney(unitPriceCents, currency)
	if err != nil {
		return OrderItem{}, err
	}
	return OrderItem{productID: productID, quantity: quantity, unitPrice: price}, nil
}

func (i OrderItem) ProductID() string { return i.productID }
func (i OrderItem) Quantity() int     { return i.quantity }
func (i OrderItem) UnitPrice() Money  { return i.unitPrice }
func (i OrderItem) Subtotal() (Money, error) { return i.unitPrice.Multiply(int64(i.quantity)) }
