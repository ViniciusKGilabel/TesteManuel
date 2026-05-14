package order_test

import (
	"testing"

	"github.com/teste-manuel/order-service/internal/domain/order"
)

func validItems(t *testing.T) []order.OrderItem {
	t.Helper()
	item, err := order.NewOrderItem("prod-1", 2, 1000, "BRL")
	if err != nil {
		t.Fatal(err)
	}
	return []order.OrderItem{item}
}

func newConfirmedOrder(t *testing.T) *order.Order {
	t.Helper()
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))
	_ = o.ReserveStock()
	_ = o.ApplyFraudCheck(order.FraudReport{RiskLevel: "LOW", RecommendedAction: "APPROVE"})
	_ = o.RequestPayment()
	_ = o.Confirm()
	return o
}

func TestNewOrder(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		userID  string
		items   func(*testing.T) []order.OrderItem
		wantErr bool
	}{
		{
			name:   "valid order starts PENDING with one event",
			id:     "ord-1", userID: "user-1",
			items: validItems,
		},
		{
			name:    "empty id is rejected",
			id:      "", userID: "user-1",
			items:   validItems,
			wantErr: true,
		},
		{
			name:    "empty userID is rejected",
			id:      "ord-1", userID: "",
			items:   validItems,
			wantErr: true,
		},
		{
			name:   "nil items are rejected",
			id:     "ord-1", userID: "user-1",
			items:  func(_ *testing.T) []order.OrderItem { return nil },
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			o, err := order.NewOrder(tc.id, tc.userID, tc.items(t))
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if o.Status() != order.StatusPending {
				t.Errorf("status: want PENDING, got %s", o.Status())
			}
			if len(o.Events()) != 1 {
				t.Errorf("events: want 1, got %d", len(o.Events()))
			}
		})
	}
}

func TestOrder_TotalCalculation(t *testing.T) {
	tests := []struct {
		name      string
		qty       int
		unitCents int64
		currency  string
		wantFloat float64
	}{
		{"3 units at 500 cents = 15.00", 3, 500, "BRL", 15.00},
		{"2 units at 1000 cents = 20.00", 2, 1000, "BRL", 20.00},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			item, err := order.NewOrderItem("prod-1", tc.qty, tc.unitCents, tc.currency)
			if err != nil {
				t.Fatal(err)
			}
			o, err := order.NewOrder("ord-1", "user-1", []order.OrderItem{item})
			if err != nil {
				t.Fatal(err)
			}
			if got := o.Total().AsFloat(); got != tc.wantFloat {
				t.Errorf("total: want %.2f, got %.2f", tc.wantFloat, got)
			}
		})
	}
}

func TestOrder_HappyPathTransitions(t *testing.T) {
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))

	steps := []struct {
		name string
		fn   func() error
		want order.Status
	}{
		{"ReserveStock", o.ReserveStock, order.StatusStockReserved},
		{"ApplyFraudCheck", func() error {
			return o.ApplyFraudCheck(order.FraudReport{
				RiskScore: 10, RiskLevel: "LOW", RecommendedAction: "APPROVE", Confidence: 0.95,
			})
		}, order.StatusFraudChecked},
		{"RequestPayment", o.RequestPayment, order.StatusPaymentRequested},
		{"Confirm", o.Confirm, order.StatusConfirmed},
	}

	for _, step := range steps {
		t.Run(step.name, func(t *testing.T) {
			if err := step.fn(); err != nil {
				t.Fatalf("%s: %v", step.name, err)
			}
			if o.Status() != step.want {
				t.Errorf("want %s, got %s", step.want, o.Status())
			}
		})
	}

	if o.FraudReport() == nil {
		t.Error("fraud report should be stored after ApplyFraudCheck")
	}
}

func TestOrder_PaymentAttemptIncrements(t *testing.T) {
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))
	_ = o.ReserveStock()
	_ = o.ApplyFraudCheck(order.FraudReport{RiskLevel: "LOW", RecommendedAction: "APPROVE"})

	if got := o.PaymentAttempt(); got != 0 {
		t.Errorf("before RequestPayment: want 0, got %d", got)
	}
	_ = o.RequestPayment()
	if got := o.PaymentAttempt(); got != 1 {
		t.Errorf("after RequestPayment: want 1, got %d", got)
	}
}

func TestOrder_Cancel(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(*testing.T) *order.Order
		wantErr bool
	}{
		{
			name:  "from PENDING succeeds",
			setup: func(t *testing.T) *order.Order { o, _ := order.NewOrder("o", "u", validItems(t)); return o },
		},
		{
			name: "from STOCK_RESERVED succeeds",
			setup: func(t *testing.T) *order.Order {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.ReserveStock()
				return o
			},
		},
		{
			name:    "from CONFIRMED fails",
			setup:   func(t *testing.T) *order.Order { return newConfirmedOrder(t) },
			wantErr: true,
		},
		{
			name: "already CANCELLED fails",
			setup: func(t *testing.T) *order.Order {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.Cancel("first")
				return o
			},
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.setup(t).Cancel("reason")
			if tc.wantErr && err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestOrder_InvalidTransitions(t *testing.T) {
	tests := []struct {
		name  string
		setup func(*testing.T) (*order.Order, func() error)
	}{
		{
			name: "ReserveStock twice",
			setup: func(t *testing.T) (*order.Order, func() error) {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.ReserveStock()
				return o, o.ReserveStock
			},
		},
		{
			name: "RequestPayment without fraud check",
			setup: func(t *testing.T) (*order.Order, func() error) {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.ReserveStock()
				return o, o.RequestPayment
			},
		},
		{
			name: "Confirm without payment requested",
			setup: func(t *testing.T) (*order.Order, func() error) {
				o, _ := order.NewOrder("o", "u", validItems(t))
				return o, o.Confirm
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, fn := tc.setup(t)
			if err := fn(); err == nil {
				t.Fatal("expected error for invalid transition, got nil")
			}
		})
	}
}

func TestOrder_RequiresStockRelease(t *testing.T) {
	tests := []struct {
		name  string
		setup func(*testing.T) *order.Order
		want  bool
	}{
		{
			name:  "PENDING does not require release",
			setup: func(t *testing.T) *order.Order { o, _ := order.NewOrder("o", "u", validItems(t)); return o },
			want:  false,
		},
		{
			name: "STOCK_RESERVED requires release",
			setup: func(t *testing.T) *order.Order {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.ReserveStock()
				return o
			},
			want: true,
		},
		{
			name: "FRAUD_CHECKED requires release",
			setup: func(t *testing.T) *order.Order {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.ReserveStock()
				_ = o.ApplyFraudCheck(order.FraudReport{RiskLevel: "LOW", RecommendedAction: "APPROVE"})
				return o
			},
			want: true,
		},
		{
			name: "PAYMENT_REQUESTED requires release",
			setup: func(t *testing.T) *order.Order {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.ReserveStock()
				_ = o.ApplyFraudCheck(order.FraudReport{RiskLevel: "LOW", RecommendedAction: "APPROVE"})
				_ = o.RequestPayment()
				return o
			},
			want: true,
		},
		{
			name:  "CONFIRMED does not require release",
			setup: func(t *testing.T) *order.Order { return newConfirmedOrder(t) },
			want:  false,
		},
		{
			name: "CANCELLED does not require release",
			setup: func(t *testing.T) *order.Order {
				o, _ := order.NewOrder("o", "u", validItems(t))
				_ = o.Cancel("reason")
				return o
			},
			want: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			o := tc.setup(t)
			if got := o.RequiresStockRelease(); got != tc.want {
				t.Errorf("RequiresStockRelease: want %v, got %v (status=%s)", tc.want, got, o.Status())
			}
		})
	}
}

func TestMoney(t *testing.T) {
	t.Run("Add same currency", func(t *testing.T) {
		a, _ := order.NewMoney(100, "BRL")
		b, _ := order.NewMoney(200, "BRL")
		sum, err := a.Add(b)
		if err != nil {
			t.Fatal(err)
		}
		if sum.Amount() != 300 {
			t.Errorf("want 300, got %d", sum.Amount())
		}
	})

	t.Run("Add currency mismatch errors", func(t *testing.T) {
		a, _ := order.NewMoney(100, "BRL")
		b, _ := order.NewMoney(100, "USD")
		if _, err := a.Add(b); err == nil {
			t.Error("expected currency mismatch error")
		}
	})

	t.Run("Negative amount is rejected", func(t *testing.T) {
		if _, err := order.NewMoney(-1, "BRL"); err == nil {
			t.Error("expected error for negative amount")
		}
	})
}

func TestOrderItem(t *testing.T) {
	t.Run("Subtotal is quantity x unit price", func(t *testing.T) {
		item, _ := order.NewOrderItem("prod-1", 4, 250, "BRL")
		sub, err := item.Subtotal()
		if err != nil {
			t.Fatal(err)
		}
		if got := sub.AsFloat(); got != 10.00 {
			t.Errorf("want 10.00, got %.2f", got)
		}
	})

	invalidTests := []struct {
		name      string
		productID string
		qty       int
		cents     int64
		currency  string
	}{
		{"empty productID", "", 1, 100, "BRL"},
		{"zero quantity", "prod-1", 0, 100, "BRL"},
	}

	for _, tc := range invalidTests {
		t.Run(tc.name+" is rejected", func(t *testing.T) {
			if _, err := order.NewOrderItem(tc.productID, tc.qty, tc.cents, tc.currency); err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}
