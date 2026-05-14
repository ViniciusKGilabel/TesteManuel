package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/application/handlers"
)

type Consumer struct {
	brokers              string
	groupID              string
	confirmHandler       *handlers.ConfirmOrderHandler
	cancelHandler        *handlers.CancelOrderHandler
	stockReservedHandler *handlers.StockReservedHandler
}

func NewConsumer(
	brokers, groupID string,
	confirmHandler *handlers.ConfirmOrderHandler,
	cancelHandler *handlers.CancelOrderHandler,
	stockReservedHandler *handlers.StockReservedHandler,
) *Consumer {
	return &Consumer{
		brokers:              brokers,
		groupID:              groupID,
		confirmHandler:       confirmHandler,
		cancelHandler:        cancelHandler,
		stockReservedHandler: stockReservedHandler,
	}
}

type incomingEvent struct {
	EventType string          `json:"event_type"`
	Payload   json.RawMessage `json:"payload"`
}

type paymentProcessedPayload struct {
	OrderID string `json:"order_id"`
}

type failurePayload struct {
	OrderID string `json:"order_id"`
	Reason  string `json:"reason"`
}

type stockReservedPayload struct {
	OrderID string `json:"order_id"`
}

func (c *Consumer) Start(ctx context.Context) error {
	kc, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers": c.brokers,
		"group.id":          c.groupID,
		"auto.offset.reset": "earliest",
	})
	if err != nil {
		return fmt.Errorf("create kafka consumer: %w", err)
	}
	defer kc.Close()

	topics := []string{
		"payment.processed",
		"payment.failed",
		"stock.reservation.failed",
		"stock.reserved",
	}
	if err := kc.SubscribeTopics(topics, nil); err != nil {
		return fmt.Errorf("subscribe topics: %w", err)
	}
	log.Printf("[kafka] consumer started, topics=%v brokers=%s group=%s", topics, c.brokers, c.groupID)

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

		topic := *msg.TopicPartition.Topic
		if err := c.Dispatch(ctx, topic, msg.Value); err != nil {
			log.Printf("[kafka] dispatch error topic=%s: %v", topic, err)
		}
	}
}

func (c *Consumer) Dispatch(ctx context.Context, topic string, data []byte) error {
	var evt incomingEvent
	if err := json.Unmarshal(data, &evt); err != nil {
		return fmt.Errorf("unmarshal event: %w", err)
	}

	switch topic {
	case "stock.reserved":
		var p stockReservedPayload
		if err := json.Unmarshal(evt.Payload, &p); err != nil {
			return fmt.Errorf("unmarshal stock.reserved: %w", err)
		}
		return c.stockReservedHandler.Handle(ctx, commands.HandleStockReserved{OrderID: p.OrderID})

	case "payment.processed":
		var p paymentProcessedPayload
		if err := json.Unmarshal(evt.Payload, &p); err != nil {
			return fmt.Errorf("unmarshal payment.processed: %w", err)
		}
		return c.confirmHandler.Handle(ctx, commands.ConfirmOrder{OrderID: p.OrderID})

	case "payment.failed", "stock.reservation.failed":
		var p failurePayload
		if err := json.Unmarshal(evt.Payload, &p); err != nil {
			return fmt.Errorf("unmarshal failure payload: %w", err)
		}
		return c.cancelHandler.Handle(ctx, commands.CancelOrder{OrderID: p.OrderID, Reason: p.Reason})

	default:
		return nil
	}
}
