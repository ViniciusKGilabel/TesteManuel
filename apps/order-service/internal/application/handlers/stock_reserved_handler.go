package handlers

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type StockReservedHandler struct {
	repo        order.Repository
	fraudClient FraudChecker
	producer    OrderEventPublisher
}

func NewStockReservedHandler(
	repo order.Repository,
	fraudClient FraudChecker,
	producer OrderEventPublisher,
) *StockReservedHandler {
	return &StockReservedHandler{repo: repo, fraudClient: fraudClient, producer: producer}
}

func (h *StockReservedHandler) Handle(ctx context.Context, cmd commands.HandleStockReserved) error {
	o, err := h.repo.FindByID(ctx, cmd.OrderID)
	if err != nil {
		return fmt.Errorf("find order: %w", err)
	}

	// Idempotent stock reservation: skip if a prior Kafka delivery already advanced the order.
	if o.Status() == order.StatusPending {
		if err := o.ReserveStock(); err != nil {
			return fmt.Errorf("mark stock reserved: %w", err)
		}
		if err := h.repo.Save(ctx, o); err != nil {
			return fmt.Errorf("save after stock reserved: %w", err)
		}
	}

	// Idempotent fraud check: re-call the fraud API only if the check hasn't been persisted yet.
	// If it was persisted on a prior attempt, reconstruct the result from the saved FraudReport.
	var fraudResp *FraudAnalysisResult
	switch o.Status() {
	case order.StatusStockReserved:
		fraudResp, err = h.fraudClient.Analyze(ctx, buildFraudRequest(o))
		if err != nil {
			return fmt.Errorf("fraud check: %w", err)
		}
		report := order.FraudReport{
			RiskScore:            fraudResp.RiskScore,
			RiskLevel:            fraudResp.RiskLevel,
			Narrative:            fraudResp.Narrative,
			RecommendedAction:    fraudResp.RecommendedAction,
			Confidence:           fraudResp.Confidence,
			ManualReviewRequired: fraudResp.ManualReviewRequired,
		}
		if err := o.ApplyFraudCheck(report); err != nil {
			return fmt.Errorf("apply fraud check: %w", err)
		}
		if err := h.repo.Save(ctx, o); err != nil {
			return fmt.Errorf("save after fraud check: %w", err)
		}
	case order.StatusFraudChecked:
		// Fraud check was persisted on a prior attempt that failed before publishing events.
		fr := o.FraudReport()
		fraudResp = &FraudAnalysisResult{
			RiskScore:            fr.RiskScore,
			RiskLevel:            fr.RiskLevel,
			Narrative:            fr.Narrative,
			RecommendedAction:    fr.RecommendedAction,
			Confidence:           fr.Confidence,
			ManualReviewRequired: fr.ManualReviewRequired,
		}
	default:
		// PAYMENT_REQUESTED, CONFIRMED, CANCELLED — handler already ran to completion.
		return nil
	}

	if fraudResp.RiskLevel == "HIGH" || fraudResp.RiskLevel == "CRITICAL" {
		if err := h.producer.PublishFraudCheckCompleted(ctx, o, fraudResp); err != nil {
			return fmt.Errorf("publish fraud.check.completed (rejected): %w", err)
		}
		requiresRelease := o.RequiresStockRelease()
		if err := o.Cancel(fmt.Sprintf("fraud rejected: %s risk", fraudResp.RiskLevel)); err != nil {
			return fmt.Errorf("cancel order (fraud): %w", err)
		}
		if err := h.repo.Save(ctx, o); err != nil {
			return fmt.Errorf("save cancelled order: %w", err)
		}
		if err := h.producer.PublishOrderCancelled(ctx, o, fmt.Sprintf("fraud:%s", fraudResp.RiskLevel)); err != nil {
			return fmt.Errorf("publish order.cancelled: %w", err)
		}
		if requiresRelease {
			if err := h.producer.PublishStockReleaseRequested(ctx, o); err != nil {
				return fmt.Errorf("publish stock.release.requested: %w", err)
			}
		}
		if err := h.producer.PublishSagaState(ctx, o); err != nil {
			log.Printf("[saga-state] publish failed order=%s: %v", o.ID(), err)
		}
		return nil
	}

	if err := o.RequestPayment(); err != nil {
		return fmt.Errorf("request payment: %w", err)
	}
	if err := h.repo.Save(ctx, o); err != nil {
		return fmt.Errorf("save after payment request: %w", err)
	}
	if err := h.producer.PublishFraudCheckCompleted(ctx, o, fraudResp); err != nil {
		return fmt.Errorf("publish fraud.check.completed: %w", err)
	}
	if err := h.producer.PublishPaymentRequested(ctx, o); err != nil {
		return fmt.Errorf("publish payment.requested: %w", err)
	}
	if err := h.producer.PublishSagaState(ctx, o); err != nil {
		log.Printf("[saga-state] publish failed order=%s: %v", o.ID(), err)
	}
	return nil
}

func buildFraudRequest(o *order.Order) FraudAnalysisRequest {
	items := make([]FraudItem, 0, len(o.Items()))
	for _, item := range o.Items() {
		items = append(items, FraudItem{
			ProductID: item.ProductID(),
			Quantity:  item.Quantity(),
			UnitPrice: item.UnitPrice().AsFloat(),
		})
	}
	s := o.FraudSignals()
	return FraudAnalysisRequest{
		OrderID:            o.ID(),
		UserID:             o.UserID(),
		Amount:             o.Total().AsFloat(),
		Currency:           o.Total().Currency(),
		Items:              items,
		UserAccountAgeDays: s.UserAccountAgeDays,
		OrdersLast24h:      s.OrdersLast24h,
		OrdersLastHour:     s.OrdersLastHour,
		CartToOrderSeconds: s.CartToOrderSeconds,
		IsNewAddress:       s.IsNewAddress,
		OrderTimeUTC:       o.CreatedAt().Format(time.RFC3339),
	}
}
