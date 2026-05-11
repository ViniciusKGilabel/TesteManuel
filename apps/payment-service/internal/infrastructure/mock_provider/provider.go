package mock_provider

import (
	"context"
	"math/rand"
	"time"
)

type Result struct {
	Authorized bool
	Captured   bool
	Declined   bool
	Reason     string
}

type Provider struct{}

func New() *Provider { return &Provider{} }

// Process simulates authorize → capture flow.
// Authorize fails 5% of the time; capture fails 2% of the time.
func (p *Provider) Process(_ context.Context, _ string, _ int64) (Result, error) {
	delay := time.Duration(50+rand.Intn(150)) * time.Millisecond
	time.Sleep(delay)

	if rand.Float64() < 0.05 {
		return Result{Declined: true, Reason: "authorization declined by issuer"}, nil
	}

	time.Sleep(delay)

	if rand.Float64() < 0.02 {
		return Result{Authorized: true, Captured: false, Reason: "capture failed: insufficient funds"}, nil
	}

	return Result{Authorized: true, Captured: true}, nil
}
