package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/teste-manuel/payment-service/internal/domain/payment"
)

type Producer struct {
	brokers string
}

func NewProducer(brokers string) *Producer {
	return &Producer{brokers: brokers}
}

type kafkaMessage struct {
	SagaID    string      `json:"saga_id"`
	EventType string      `json:"event_type"`
	Timestamp string      `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}

func (p *Producer) publish(_ context.Context, topic, key string, msg kafkaMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}
	fmt.Printf("[kafka] topic=%s key=%s payload=%s\n", topic, key, data)
	return nil
}

func (p *Producer) PublishPaymentProcessed(ctx context.Context, pay *payment.Payment) error {
	return p.publish(ctx, "payment.processed", pay.OrderID(), kafkaMessage{
		SagaID:    "order-" + pay.OrderID(),
		EventType: "payment.processed",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"payment_id": pay.ID(),
			"order_id":   pay.OrderID(),
		},
	})
}

func (p *Producer) PublishPaymentFailed(ctx context.Context, pay *payment.Payment) error {
	return p.publish(ctx, "payment.failed", pay.OrderID(), kafkaMessage{
		SagaID:    "order-" + pay.OrderID(),
		EventType: "payment.failed",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"payment_id": pay.ID(),
			"order_id":   pay.OrderID(),
			"reason":     pay.FailureReason(),
		},
	})
}
