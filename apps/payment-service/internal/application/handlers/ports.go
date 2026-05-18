package handlers

import (
	"context"

	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

// PaymentEventPublisher is the application-layer port for publishing payment Kafka events.
// infrastructure/kafka.Producer satisfies this interface.
type PaymentEventPublisher interface {
	PublishPaymentProcessed(ctx context.Context, pay *payment.Payment) error
	PublishPaymentFailed(ctx context.Context, pay *payment.Payment) error
}
