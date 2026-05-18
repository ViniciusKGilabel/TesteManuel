package handlers

import (
	"context"

	"github.com/teste-manuel/order-service/internal/domain/order"
)

// FraudAnalysisRequest is the application-layer DTO for fraud analysis input.
type FraudAnalysisRequest struct {
	OrderID            string
	UserID             string
	Amount             float64
	Currency           string
	Items              []FraudItem
	UserAccountAgeDays int
	OrdersLast24h      int
	OrdersLastHour     int
	CartToOrderSeconds int
	IsNewAddress       bool
	OrderTimeUTC       string
}

// FraudItem is an order line item within a FraudAnalysisRequest.
type FraudItem struct {
	ProductID string
	Quantity  int
	UnitPrice float64
}

// FraudAnalysisResult is the application-layer DTO for fraud analysis output.
type FraudAnalysisResult struct {
	RiskScore            int
	RiskLevel            string
	Narrative            string
	RecommendedAction    string
	SignalsFlagged       []string
	Confidence           float64
	ManualReviewRequired bool
}

// FraudChecker is the application-layer port for synchronous fraud analysis.
// infrastructure/fraud.Client satisfies this interface.
type FraudChecker interface {
	Analyze(ctx context.Context, req FraudAnalysisRequest) (*FraudAnalysisResult, error)
}

// OrderEventPublisher is the application-layer port for publishing order Kafka events.
// infrastructure/kafka.Producer satisfies this interface.
type OrderEventPublisher interface {
	PublishOrderPlaced(ctx context.Context, o *order.Order) error
	PublishOrderConfirmed(ctx context.Context, o *order.Order) error
	PublishOrderCancelled(ctx context.Context, o *order.Order, reason string) error
	PublishStockReleaseRequested(ctx context.Context, o *order.Order) error
	// PublishFraudCheckCompleted emits fraud.check.completed for observability only.
	// Saga routing is driven by payment.requested — never by this event.
	PublishFraudCheckCompleted(ctx context.Context, o *order.Order, result *FraudAnalysisResult) error
	PublishPaymentRequested(ctx context.Context, o *order.Order) error
	PublishSagaState(ctx context.Context, o *order.Order) error
}
