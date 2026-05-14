package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/teste-manuel/order-service/internal/domain/order"
	"github.com/teste-manuel/order-service/internal/infrastructure/fraud"
)

type Producer struct {
	brokers string
	kp      *kafka.Producer // nil when brokers == "" (no-op / test mode)
}

func NewProducer(brokers string) (*Producer, error) {
	p := &Producer{brokers: brokers}
	if brokers == "" {
		return p, nil
	}
	kp, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers": brokers,
		"acks":              "all",
		"retries":           3,
		"retry.backoff.ms":  100,
	})
	if err != nil {
		return nil, fmt.Errorf("create kafka producer: %w", err)
	}
	p.kp = kp
	return p, nil
}

// Close flushes pending messages and releases producer resources.
func (p *Producer) Close() {
	if p.kp != nil {
		p.kp.Flush(30 * 1000)
		p.kp.Close()
	}
}

type kafkaMessage struct {
	SagaID    string      `json:"saga_id"`
	EventType string      `json:"event_type"`
	Timestamp string      `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}

func (p *Producer) publish(ctx context.Context, topic, key string, msg kafkaMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	if p.kp == nil {
		log.Printf("[kafka] topic=%s key=%s payload=%s\n", topic, key, data)
		return nil
	}

	deliveryChan := make(chan kafka.Event, 1)
	if err := p.kp.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Key:            []byte(key),
		Value:          data,
	}, deliveryChan); err != nil {
		return fmt.Errorf("enqueue message to %s: %w", topic, err)
	}

	select {
	case e := <-deliveryChan:
		m := e.(*kafka.Message)
		if m.TopicPartition.Error != nil {
			return fmt.Errorf("delivery failed topic=%s: %w", topic, m.TopicPartition.Error)
		}
		return nil
	case <-ctx.Done():
		return fmt.Errorf("context cancelled waiting for delivery to %s: %w", topic, ctx.Err())
	}
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

func (p *Producer) PublishFraudCheckCompleted(ctx context.Context, o *order.Order, resp *fraud.AnalyzeResponse) error {
	return p.publish(ctx, "fraud.check.completed", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "fraud.check.completed",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"order_id":           o.ID(),
			"risk_score":         resp.RiskScore,
			"risk_level":         resp.RiskLevel,
			"recommended_action": resp.RecommendedAction,
			"confidence":         resp.Confidence,
		},
	})
}

func (p *Producer) PublishPaymentRequested(ctx context.Context, o *order.Order) error {
	return p.publish(ctx, "payment.requested", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "payment.requested",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"order_id":    o.ID(),
			"user_id":     o.UserID(),
			"total_cents": o.Total().Amount(),
			"currency":    o.Total().Currency(),
			"attempt":     o.PaymentAttempt(),
		},
	})
}

// PublishSagaState emits a saga-state snapshot to the compacted `saga-state` topic.
// Keyed by order ID so the log compactor retains only the latest state per order.
func (p *Producer) PublishSagaState(ctx context.Context, o *order.Order) error {
	return p.publish(ctx, "saga-state", o.ID(), kafkaMessage{
		SagaID:    "order-" + o.ID(),
		EventType: "saga-state",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Payload: map[string]interface{}{
			"order_id":   o.ID(),
			"user_id":    o.UserID(),
			"status":     string(o.Status()),
			"updated_at": o.UpdatedAt().Format(time.RFC3339),
		},
	})
}
