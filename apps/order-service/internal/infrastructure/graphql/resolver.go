package graphql

import (
	_ "embed"
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/teste-manuel/order-service/internal/application/commands"
	"github.com/teste-manuel/order-service/internal/application/handlers"
	"github.com/teste-manuel/order-service/internal/application/queries"
	"github.com/teste-manuel/order-service/internal/domain/order"
)

//go:embed schema.graphql
var sdl string

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

type gqlRequest struct {
	Query         string                 `json:"query"`
	Variables     map[string]interface{} `json:"variables"`
	OperationName string                 `json:"operationName"`
}

// ServeHTTP implements the Apollo Federation subgraph protocol:
//   - POST { _service { sdl } }   → returns schema SDL for IntrospectAndCompose
//   - POST { _entities(...) }      → resolves Order entities by key
//   - POST mutation { placeOrder } → creates a new order
//   - POST query   { order/orders }→ fetches orders
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req gqlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	switch rootFieldName(req.Query) {
	case "_service":
		// IntrospectAndCompose sends { _service { sdl } } at gateway startup.
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": map[string]interface{}{
				"_service": map[string]interface{}{"sdl": sdl},
			},
		})

	case "_entities":
		// Gateway sends _entities queries to resolve cross-service references.
		h.serveEntities(ctx, w, req.Variables)

	default:
		if strings.HasPrefix(strings.TrimSpace(req.Query), "mutation") {
			h.serveMutation(ctx, w, req.Variables)
		} else {
			json.NewEncoder(w).Encode(h.serveQuery(ctx, req.Variables))
		}
	}
}

// serveEntities resolves Order entities from Apollo Gateway representation objects
// (e.g. [{"__typename":"Order","id":"ord-1"}]).
func (h *Handler) serveEntities(ctx context.Context, w http.ResponseWriter, vars map[string]interface{}) {
	reps, _ := vars["representations"].([]interface{})
	entities := make([]interface{}, 0, len(reps))

	for _, rep := range reps {
		m, ok := rep.(map[string]interface{})
		if !ok {
			entities = append(entities, nil)
			continue
		}
		if typename, _ := m["__typename"].(string); typename != "Order" {
			entities = append(entities, nil)
			continue
		}
		id, _ := m["id"].(string)
		o, err := h.getOrder.Handle(ctx, queries.GetOrder{OrderID: id})
		if err != nil {
			entities = append(entities, nil)
			continue
		}
		entity := orderToMap(o)
		entity["__typename"] = "Order"
		entities = append(entities, entity)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": map[string]interface{}{"_entities": entities},
	})
}

// serveMutation handles placeOrder mutations.
func (h *Handler) serveMutation(ctx context.Context, w http.ResponseWriter, vars map[string]interface{}) {
	userID, _ := vars["userId"].(string)
	if userID == "" {
		json.NewEncoder(w).Encode(errResponse("userId is required"))
		return
	}

	rawItems, _ := vars["items"].([]interface{})
	items := make([]commands.OrderItemInput, 0, len(rawItems))
	for _, raw := range rawItems {
		m, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		items = append(items, commands.OrderItemInput{
			ProductID:      strVal(m["productId"]),
			Quantity:       intVal(m["quantity"]),
			UnitPriceCents: int64Val(m["unitPriceCents"]),
			Currency:       strVal(m["currency"]),
		})
	}

	o, err := h.placeOrder.Handle(ctx, commands.PlaceOrder{
		OrderID: uuid.New().String(),
		UserID:  userID,
		Items:   items,
	})
	if err != nil {
		json.NewEncoder(w).Encode(errResponse(err.Error()))
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": map[string]interface{}{"placeOrder": orderToMap(o)},
	})
}

// serveQuery handles order(id:) and orders(userId:) queries.
func (h *Handler) serveQuery(ctx context.Context, vars map[string]interface{}) interface{} {
	if id, ok := vars["id"].(string); ok && id != "" {
		o, err := h.getOrder.Handle(ctx, queries.GetOrder{OrderID: id})
		if err != nil {
			return errResponse(err.Error())
		}
		return map[string]interface{}{"data": map[string]interface{}{"order": orderToMap(o)}}
	}
	if userID, ok := vars["userId"].(string); ok && userID != "" {
		orders, err := h.getOrdersByUser.Handle(ctx, queries.GetOrdersByUser{UserID: userID})
		if err != nil {
			return errResponse(err.Error())
		}
		result := make([]map[string]interface{}, 0, len(orders))
		for _, o := range orders {
			result = append(result, orderToMap(o))
		}
		return map[string]interface{}{"data": map[string]interface{}{"orders": result}}
	}
	return map[string]interface{}{"data": nil}
}

func orderToMap(o *order.Order) map[string]interface{} {
	if o == nil {
		return nil
	}
	items := make([]map[string]interface{}, 0, len(o.Items()))
	for _, item := range o.Items() {
		sub, err := item.Subtotal()
		if err != nil {
			continue
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

func errResponse(msg string) map[string]interface{} {
	return map[string]interface{}{"errors": []map[string]string{{"message": msg}}}
}

// rootFieldName returns the first root-level field name from a GraphQL document,
// correctly handling alias syntax (alias: fieldName).
func rootFieldName(query string) string {
	idx := strings.IndexByte(query, '{')
	if idx < 0 {
		return ""
	}
	s := query[idx+1:]

	// Scan for the first identifier and its end position.
	start := -1
	end := -1
	for i, ch := range s {
		if isIdentRune(ch) {
			if start < 0 {
				start = i
			}
		} else if start >= 0 {
			end = i
			break
		}
	}
	if start < 0 {
		return ""
	}
	if end < 0 {
		end = len(s)
	}
	candidate := s[start:end]

	// If the next non-whitespace character is ':', candidate is an alias; skip to the actual field name.
	rest := strings.TrimLeft(s[end:], " \t\r\n")
	if len(rest) > 0 && rest[0] == ':' {
		return firstIdent(strings.TrimLeft(rest[1:], " \t\r\n"))
	}
	return candidate
}

// firstIdent returns the first GraphQL identifier found in s.
func firstIdent(s string) string {
	start := -1
	for i, ch := range s {
		if isIdentRune(ch) {
			if start < 0 {
				start = i
			}
		} else if start >= 0 {
			return s[start:i]
		}
	}
	if start >= 0 {
		return s[start:]
	}
	return ""
}

func isIdentRune(ch rune) bool {
	return ch == '_' || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')
}

func strVal(v interface{}) string {
	s, _ := v.(string)
	return s
}

func intVal(v interface{}) int {
	f, _ := v.(float64) // JSON numbers always decode as float64
	return int(f)
}

func int64Val(v interface{}) int64 {
	f, _ := v.(float64)
	return int64(f)
}
