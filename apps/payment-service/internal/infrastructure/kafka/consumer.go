package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/google/uuid"
	"github.com/teste-manuel/payment-service/internal/application/commands"
)

// paymentProcessor is the application-layer port consumed by the Kafka consumer.
// handlers.ProcessPaymentHandler satisfies this interface.
type paymentProcessor interface {
	Handle(ctx context.Context, cmd commands.ProcessPayment) error
}

type Consumer struct {
	brokers        string
	groupID        string
	processHandler paymentProcessor
}

func NewConsumer(brokers, groupID string, handler paymentProcessor) *Consumer {
	return &Consumer{brokers: brokers, groupID: groupID, processHandler: handler}
}

type paymentRequestedPayload struct {
	OrderID    string `json:"order_id"`
	UserID     string `json:"user_id"`
	TotalCents int64  `json:"total_cents"`
	Currency   string `json:"currency"`
	Attempt    int    `json:"attempt"`
}

func (c *Consumer) Start(ctx context.Context) error {
	kc, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":  c.brokers,
		"group.id":           c.groupID,
		"auto.offset.reset":  "earliest",
		"enable.auto.commit": false,
	})
	if err != nil {
		return fmt.Errorf("create kafka consumer: %w", err)
	}
	defer kc.Close()

	if err := kc.Subscribe("payment.requested", nil); err != nil {
		return fmt.Errorf("subscribe payment.requested: %w", err)
	}
	log.Printf("[kafka] payment-service consumer started, brokers=%s group=%s", c.brokers, c.groupID)

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		msg, err := kc.ReadMessage(100 * time.Millisecond)
		if err != nil {
			var ke kafka.Error
			if errors.As(err, &ke) && ke.Code() == kafka.ErrTimedOut {
				continue
			}
			log.Printf("[kafka] read error: %v", err)
			continue
		}

		var envelope struct {
			Payload json.RawMessage `json:"payload"`
		}
		if err := json.Unmarshal(msg.Value, &envelope); err != nil {
			log.Printf("[kafka] bad envelope: %v", err)
			continue
		}

		if err := c.Dispatch(ctx, []byte(envelope.Payload)); err != nil {
			log.Printf("[kafka] dispatch error offset=%d: %v — offset not committed, will retry", msg.TopicPartition.Offset, err)
			continue
		}
		if _, err := kc.CommitMessage(msg); err != nil {
			log.Printf("[kafka] commit error offset=%d: %v", msg.TopicPartition.Offset, err)
		}
	}
}

func (c *Consumer) Dispatch(ctx context.Context, data []byte) error {
	var payload paymentRequestedPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return fmt.Errorf("unmarshal payment.requested: %w", err)
	}

	attempt := payload.Attempt
	if attempt == 0 {
		attempt = 1
	}

	return c.processHandler.Handle(ctx, commands.ProcessPayment{
		PaymentID:   uuid.New().String(),
		OrderID:     payload.OrderID,
		UserID:      payload.UserID,
		AmountCents: payload.TotalCents,
		Currency:    payload.Currency,
		Attempt:     attempt,
	})
}
