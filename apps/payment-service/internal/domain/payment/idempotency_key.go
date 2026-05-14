package payment

import (
	"crypto/sha256"
	"fmt"
)

// IdempotencyKey returns a deterministic key for a given order + attempt pair.
// Prevents double-charging if the saga retries payment.
// Input format hashed: "<orderID>:<attempt>" (colon separator, decimal attempt).
func IdempotencyKey(orderID string, attempt int) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", orderID, attempt)))
	return fmt.Sprintf("%x", h)
}
