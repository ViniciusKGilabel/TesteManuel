package graphql

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/application/handlers"
	"github.com/teste-manuel/order-service/internal/application/queries"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

type Handler struct {
	placeOrder      *handlers.PlaceOrderHandler
	getOrder        *handlers.GetOrderHandler
	getOrdersByUser *handlers.GetOrdersByUserHandler
}

func NewHandler(
	placeOrder *handlers.PlaceOrderHandler,
	getOrder *handlers.GetOrderHandler,
	getOrdersByUser *handlers.GetOrdersByUserHandler,
) *Handler {
	return &Handler{
		placeOrder:      placeOrder,
		getOrder:        getOrder,
		getOrdersByUser: getOrdersByUser,
	}
}

// ServeHTTP provides a minimal GraphQL endpoint (POST /graphql).
// Replace with gqlgen-generated handler for full federation support.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/health" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Query     string                 `json:"query"`
		Variables map[string]interface{} `json:"variables"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	respond(w, h.route(ctx, req.Variables))
}

func (h *Handler) route(ctx context.Context, vars map[string]interface{}) interface{} {
	if id, ok := vars["id"].(string); ok && id != "" {
		o, err := h.getOrder.Handle(ctx, queries.GetOrder{OrderID: id})
		if err != nil {
			return errResponse(err)
		}
		return map[string]interface{}{"data": map[string]interface{}{"order": orderToMap(o)}}
	}
	if userID, ok := vars["userId"].(string); ok && userID != "" {
		orders, err := h.getOrdersByUser.Handle(ctx, queries.GetOrdersByUser{UserID: userID})
		if err != nil {
			return errResponse(err)
		}
		result := make([]map[string]interface{}, 0, len(orders))
		for _, o := range orders {
			result = append(result, orderToMap(o))
		}
		return map[string]interface{}{"data": map[string]interface{}{"orders": result}}
	}
	return map[string]interface{}{"data": nil}
}

func (h *Handler) PlaceOrder(ctx context.Context, userID string, items []commands.OrderItemInput) (*order.Order, error) {
	return h.placeOrder.Handle(ctx, commands.PlaceOrder{
		OrderID: uuid.New().String(),
		UserID:  userID,
		Items:   items,
	})
}

func respond(w http.ResponseWriter, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(body)
}

func errResponse(err error) map[string]interface{} {
	return map[string]interface{}{"errors": []map[string]string{{"message": err.Error()}}}
}

func orderToMap(o *order.Order) map[string]interface{} {
	if o == nil {
		return nil
	}
	items := make([]map[string]interface{}, 0, len(o.Items()))
	for _, item := range o.Items() {
		sub, err := item.Subtotal()
		if err != nil {
			return errResponse(err)
		}
		items = append(items, map[string]interface{}{
			"productId": item.ProductID(),
			"quantity":  item.Quantity(),
			"unitPrice": item.UnitPrice().AsFloat(),
			"subtotal":  sub.AsFloat(),
		})
	}
	result := map[string]interface{}{
		"id":        o.ID(),
		"userId":    o.UserID(),
		"items":     items,
		"total":     o.Total().AsFloat(),
		"status":    string(o.Status()),
		"createdAt": o.CreatedAt().Format("2006-01-02T15:04:05Z"),
		"updatedAt": o.UpdatedAt().Format("2006-01-02T15:04:05Z"),
	}
	if fr := o.FraudReport(); fr != nil {
		result["fraudReport"] = map[string]interface{}{
			"riskScore":         fr.RiskScore,
			"riskLevel":         fr.RiskLevel,
			"narrative":         fr.Narrative,
			"recommendedAction": fr.RecommendedAction,
			"confidence":        fr.Confidence,
		}
	}
	return result
}
