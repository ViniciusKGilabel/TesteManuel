package fraud

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type AnalyzeRequest struct {
	OrderID            string  `json:"order_id"`
	UserID             string  `json:"user_id"`
	Amount             float64 `json:"amount"`
	Currency           string  `json:"currency"`
	Items              []Item  `json:"items"`
	UserAccountAgeDays int     `json:"user_account_age_days"`
	OrdersLast24h      int     `json:"orders_last_24h"`
	OrdersLastHour     int     `json:"orders_last_hour"`
	CartToOrderSeconds int     `json:"cart_to_order_seconds"`
	IsNewAddress       bool    `json:"is_new_address"`
	OrderTimeUTC       string  `json:"order_time_utc"`
}

type Item struct {
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

type AnalyzeResponse struct {
	RiskScore         int      `json:"risk_score"`
	RiskLevel         string   `json:"risk_level"`
	Narrative         string   `json:"narrative"`
	RecommendedAction string   `json:"recommended_action"`
	SignalsFlagged    []string `json:"signals_flagged"`
	Confidence        float64  `json:"confidence"`
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

func (c *Client) Analyze(ctx context.Context, req AnalyzeRequest) (*AnalyzeResponse, error) {
	body, err := json.Marshal(req)
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

	var result AnalyzeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}
