package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/teste-manuel/payment-service/internal/application/commands"
	"github.com/teste-manuel/payment-service/internal/application/handlers"
)

type Consumer struct {
	brokers        string
	groupID        string
	processHandler *handlers.ProcessPaymentHandler
}

func NewConsumer(brokers, groupID string, handler *handlers.ProcessPaymentHandler) *Consumer {
	return &Consumer{brokers: brokers, groupID: groupID, processHandler: handler}
}

type paymentRequestedPayload struct {
	OrderID  string  `json:"order_id"`
	UserID   string  `json:"user_id"`
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
	Attempt  int     `json:"attempt"`
}

func (c *Consumer) Start(ctx context.Context) error {
	log.Printf("[kafka] payment-service consumer starting, brokers=%s group=%s", c.brokers, c.groupID)
	// production: replace with confluent-kafka-go consumer loop
	return nil
}

func (c *Consumer) dispatch(ctx context.Context, data []byte) error {
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
		AmountCents: int64(payload.Amount * 100),
		Currency:    payload.Currency,
		Attempt:     attempt,
	})
}
