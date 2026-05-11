package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/teste-manuel/order-service/internal/domain/order"
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

func (p *Producer) publish(_ context.Context, topic string, key string, msg kafkaMessage) error {
	// production: replace with confluent-kafka-go producer
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}
	fmt.Printf("[kafka] topic=%s key=%s payload=%s\n", topic, key, data)
	return nil
}

func (p *Producer) PublishOrderPlaced(ctx context.Context, o *order.Order) error {
	items := make([]map[string]interface{}, 0, len(o.Items()))
	for _, item := range o.Items() {
		items = append(items, map[string]interface{}{
			"product_id": item.ProductID(),
			"quantity":   item.Quantity(),
			"unit_price": item.UnitPrice().AsFloat(),
		})
	}
	return p.publish(ctx, "order.placed", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "order.placed",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"order_id": o.ID(),
			"user_id":  o.UserID(),
			"items":    items,
			"total":    o.Total().AsFloat(),
			"currency": o.Total().Currency(),
		},
	})
}

func (p *Producer) PublishOrderConfirmed(ctx context.Context, o *order.Order) error {
	return p.publish(ctx, "order.confirmed", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "order.confirmed",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload:   map[string]interface{}{"order_id": o.ID()},
	})
}

func (p *Producer) PublishOrderCancelled(ctx context.Context, o *order.Order, reason string) error {
	return p.publish(ctx, "order.cancelled", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "order.cancelled",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload:   map[string]interface{}{"order_id": o.ID(), "reason": reason},
	})
}

func (p *Producer) PublishStockReleaseRequested(ctx context.Context, o *order.Order) error {
	items := make([]map[string]interface{}, 0, len(o.Items()))
	for _, item := range o.Items() {
		items = append(items, map[string]interface{}{
			"product_id": item.ProductID(),
			"quantity":   item.Quantity(),
		})
	}
	return p.publish(ctx, "stock.release.requested", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "stock.release.requested",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload:   map[string]interface{}{"order_id": o.ID(), "items": items},
	})
}

func (p *Producer) PublishPaymentRequested(ctx context.Context, o *order.Order) error {
	return p.publish(ctx, "payment.requested", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "payment.requested",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"order_id": o.ID(),
			"user_id":  o.UserID(),
			"amount":   o.Total().AsFloat(),
			"currency": o.Total().Currency(),
		},
	})
}
