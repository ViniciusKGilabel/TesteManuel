package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/application/handlers"
)

type Consumer struct {
	brokers        string
	groupID        string
	confirmHandler *handlers.ConfirmOrderHandler
	cancelHandler  *handlers.CancelOrderHandler
}

func NewConsumer(
	brokers, groupID string,
	confirmHandler *handlers.ConfirmOrderHandler,
	cancelHandler *handlers.CancelOrderHandler,
) *Consumer {
	return &Consumer{
		brokers:        brokers,
		groupID:        groupID,
		confirmHandler: confirmHandler,
		cancelHandler:  cancelHandler,
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

func (c *Consumer) Start(ctx context.Context) error {
	topics := []string{
		"payment.processed",
		"payment.failed",
		"stock.reservation.failed",
		"stock.reserved",
	}
	log.Printf("[kafka] consumer starting, topics=%v brokers=%s group=%s", topics, c.brokers, c.groupID)

	// production: replace with confluent-kafka-go consumer loop
	_ = topics
	return nil
}

func (c *Consumer) dispatch(ctx context.Context, topic string, data []byte) error {
	var evt incomingEvent
	if err := json.Unmarshal(data, &evt); err != nil {
		return fmt.Errorf("unmarshal event: %w", err)
	}

	switch topic {
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
