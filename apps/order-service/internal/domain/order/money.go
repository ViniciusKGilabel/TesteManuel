package order

import (
	"errors"
	"fmt"
	"math"
)

type Money struct {
	amount   int64  // stored in cents to avoid float precision issues
	currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
	if amount < 0 {
		return Money{}, errors.New("money amount cannot be negative")
	}
	if currency == "" {
		return Money{}, errors.New("currency is required")
	}
	return Money{amount: amount, currency: currency}, nil
}

func (m Money) Amount() int64    { return m.amount }
func (m Money) Currency() string { return m.currency }

func (m Money) Add(other Money) (Money, error) {
	if m.currency != other.currency {
		return Money{}, fmt.Errorf("cannot add %s and %s", m.currency, other.currency)
	}
	sum := m.amount + other.amount
	if other.amount > 0 && sum < m.amount {
		return Money{}, errors.New("money addition overflow")
	}
	return Money{amount: sum, currency: m.currency}, nil
}

func (m Money) Multiply(factor int64) (Money, error) {
	if factor < 0 {
		return Money{}, errors.New("money multiply factor cannot be negative")
	}
	if factor > 0 && m.amount > math.MaxInt64/factor {
		return Money{}, errors.New("money multiplication overflow")
	}
	return Money{amount: m.amount * factor, currency: m.currency}, nil
}

func (m Money) AsFloat() float64 {
	return float64(m.amount) / 100.0
}
