package fraud

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/teste-manuel/order-service/internal/application/handlers"
)

const maxResponseBytes = 1 << 20 // 1 MiB

type analyzeRequest struct {
	OrderID            string        `json:"order_id"`
	UserID             string        `json:"user_id"`
	Amount             float64       `json:"amount"`
	Currency           string        `json:"currency"`
	Items              []analyzeItem `json:"items"`
	UserAccountAgeDays int           `json:"user_account_age_days"`
	OrdersLast24h      int           `json:"orders_last_24h"`
	OrdersLastHour     int           `json:"orders_last_hour"`
	CartToOrderSeconds int           `json:"cart_to_order_seconds"`
	IsNewAddress       bool          `json:"is_new_address"`
	OrderTimeUTC       string        `json:"order_time_utc"`
}

type analyzeItem struct {
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

type analyzeResponse struct {
	RiskScore            int      `json:"risk_score"`
	RiskLevel            string   `json:"risk_level"`
	Narrative            string   `json:"narrative"`
	RecommendedAction    string   `json:"recommended_action"`
	SignalsFlagged       []string `json:"signals_flagged"`
	Confidence           float64  `json:"confidence"`
	ManualReviewRequired bool     `json:"manual_review_required"`
}

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) Analyze(ctx context.Context, req handlers.FraudAnalysisRequest) (*handlers.FraudAnalysisResult, error) {
	items := make([]analyzeItem, 0, len(req.Items))
	for _, i := range req.Items {
		items = append(items, analyzeItem{
			ProductID: i.ProductID,
			Quantity:  i.Quantity,
			UnitPrice: i.UnitPrice,
		})
	}
	payload := analyzeRequest{
		OrderID:            req.OrderID,
		UserID:             req.UserID,
		Amount:             req.Amount,
		Currency:           req.Currency,
		Items:              items,
		UserAccountAgeDays: req.UserAccountAgeDays,
		OrdersLast24h:      req.OrdersLast24h,
		OrdersLastHour:     req.OrdersLastHour,
		CartToOrderSeconds: req.CartToOrderSeconds,
		IsNewAddress:       req.IsNewAddress,
		OrderTimeUTC:       req.OrderTimeUTC,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/analyze", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call fraud sidecar: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fraud sidecar returned status %d", resp.StatusCode)
	}

	var result analyzeResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseBytes)).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &handlers.FraudAnalysisResult{
		RiskScore:            result.RiskScore,
		RiskLevel:            result.RiskLevel,
		Narrative:            result.Narrative,
		RecommendedAction:    result.RecommendedAction,
		SignalsFlagged:       result.SignalsFlagged,
		Confidence:           result.Confidence,
		ManualReviewRequired: result.ManualReviewRequired,
	}, nil
}
