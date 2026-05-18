package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
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
