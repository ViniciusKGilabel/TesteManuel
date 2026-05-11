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

func TestNewOrder_Valid(t *testing.T) {
	o, err := order.NewOrder("ord-1", "user-1", validItems(t))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if o.Status() != order.StatusPending {
		t.Errorf("expected PENDING, got %s", o.Status())
	}
	if len(o.Events()) != 1 {
		t.Errorf("expected 1 event, got %d", len(o.Events()))
	}
}

func TestNewOrder_EmptyID(t *testing.T) {
	_, err := order.NewOrder("", "user-1", validItems(t))
	if err == nil {
		t.Error("expected error for empty id")
	}
}

func TestNewOrder_EmptyUserID(t *testing.T) {
	_, err := order.NewOrder("ord-1", "", validItems(t))
	if err == nil {
		t.Error("expected error for empty userID")
	}
}

func TestNewOrder_NoItems(t *testing.T) {
	_, err := order.NewOrder("ord-1", "user-1", nil)
	if err == nil {
		t.Error("expected error for empty items")
	}
}

func TestOrder_TotalCalculation(t *testing.T) {
	item, _ := order.NewOrderItem("prod-1", 3, 500, "BRL") // 3 × R$5.00 = R$15.00
	o, _ := order.NewOrder("ord-1", "user-1", []order.OrderItem{item})
	if got := o.Total().AsFloat(); got != 15.00 {
		t.Errorf("expected 15.00, got %.2f", got)
	}
}

func TestOrder_HappyPathTransitions(t *testing.T) {
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))

	if err := o.ReserveStock(); err != nil {
		t.Fatal(err)
	}
	if o.Status() != order.StatusStockReserved {
		t.Errorf("expected STOCK_RESERVED, got %s", o.Status())
	}

	report := order.FraudReport{
		RiskScore:         10,
		RiskLevel:         "LOW",
		RecommendedAction: "APPROVE",
		Confidence:        0.95,
	}
	if err := o.ApplyFraudCheck(report); err != nil {
		t.Fatal(err)
	}
	if o.FraudReport() == nil {
		t.Error("expected fraud report to be stored")
	}

	if err := o.RequestPayment(); err != nil {
		t.Fatal(err)
	}
	if err := o.Confirm(); err != nil {
		t.Fatal(err)
	}
	if o.Status() != order.StatusConfirmed {
		t.Errorf("expected CONFIRMED, got %s", o.Status())
	}
}

func TestOrder_Cancel_FromPending(t *testing.T) {
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))
	if err := o.Cancel("test cancellation"); err != nil {
		t.Fatal(err)
	}
	if o.Status() != order.StatusCancelled {
		t.Errorf("expected CANCELLED, got %s", o.Status())
	}
}

func TestOrder_CannotCancelConfirmed(t *testing.T) {
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))
	_ = o.ReserveStock()
	_ = o.ApplyFraudCheck(order.FraudReport{RecommendedAction: "APPROVE"})
	_ = o.RequestPayment()
	_ = o.Confirm()

	if err := o.Cancel("late cancel"); err == nil {
		t.Error("expected error cancelling a confirmed order")
	}
}

func TestOrder_InvalidTransition_ReserveStockTwice(t *testing.T) {
	o, _ := order.NewOrder("ord-1", "user-1", validItems(t))
	_ = o.ReserveStock()
	if err := o.ReserveStock(); err == nil {
		t.Error("expected error reserving stock twice")
	}
}

func TestMoney_Add(t *testing.T) {
	a, _ := order.NewMoney(100, "BRL")
	b, _ := order.NewMoney(200, "BRL")
	sum, err := a.Add(b)
	if err != nil {
		t.Fatal(err)
	}
	if sum.Amount() != 300 {
		t.Errorf("expected 300, got %d", sum.Amount())
	}
}

func TestMoney_Add_CurrencyMismatch(t *testing.T) {
	a, _ := order.NewMoney(100, "BRL")
	b, _ := order.NewMoney(100, "USD")
	if _, err := a.Add(b); err == nil {
		t.Error("expected currency mismatch error")
	}
}

func TestMoney_NegativeAmount(t *testing.T) {
	if _, err := order.NewMoney(-1, "BRL"); err == nil {
		t.Error("expected error for negative amount")
	}
}

func TestOrderItem_Subtotal(t *testing.T) {
	item, _ := order.NewOrderItem("prod-1", 4, 250, "BRL") // 4 × R$2.50 = R$10.00
	sub, err := item.Subtotal()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := sub.AsFloat(); got != 10.00 {
		t.Errorf("expected 10.00, got %.2f", got)
	}
}

func TestOrderItem_InvalidProductID(t *testing.T) {
	if _, err := order.NewOrderItem("", 1, 100, "BRL"); err == nil {
		t.Error("expected error for empty productID")
	}
}

func TestOrderItem_InvalidQuantity(t *testing.T) {
	if _, err := order.NewOrderItem("prod-1", 0, 100, "BRL"); err == nil {
		t.Error("expected error for zero quantity")
	}
}
