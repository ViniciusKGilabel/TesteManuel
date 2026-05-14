package handlers_test

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/teste-manuel/payment-service/internal/application/commands"
	"github.com/teste-manuel/payment-service/internal/application/handlers"
	"github.com/teste-manuel/payment-service/internal/domain/payment"
	"github.com/teste-manuel/payment-service/internal/infrastructure/kafka"
)

// --- in-memory test doubles ---

type inMemoryPaymentRepo struct {
	mu   sync.RWMutex
	data map[string]*payment.Payment
}

func newPaymentRepo() *inMemoryPaymentRepo {
	return &inMemoryPaymentRepo{data: make(map[string]*payment.Payment)}
}

func (r *inMemoryPaymentRepo) Save(_ context.Context, p *payment.Payment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.data[p.ID()] = p
	return nil
}

func (r *inMemoryPaymentRepo) FindByID(_ context.Context, id string) (*payment.Payment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if p, ok := r.data[id]; ok {
		return p, nil
	}
	return nil, fmt.Errorf("payment %s not found", id)
}

func (r *inMemoryPaymentRepo) FindByIdempotencyKey(_ context.Context, key string) (*payment.Payment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.data {
		if p.IdempotencyKey() == key {
			return p, nil
		}
	}
	return nil, fmt.Errorf("payment with key %s not found", key)
}

type inMemoryIdempotencyStore struct {
	mu   sync.Mutex
	data map[string]payment.IdempotencyState
}

func newIdempotencyStore() *inMemoryIdempotencyStore {
	return &inMemoryIdempotencyStore{data: make(map[string]payment.IdempotencyState)}
}

func (s *inMemoryIdempotencyStore) Get(_ context.Context, key string) (payment.IdempotencyState, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	state, ok := s.data[key]
	return state, ok, nil
}

func (s *inMemoryIdempotencyStore) Insert(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.data[key]; exists {
		return payment.ErrAlreadyInserted
	}
	s.data[key] = payment.IdempotencyProcessing
	return nil
}

func (s *inMemoryIdempotencyStore) Update(_ context.Context, key string, state payment.IdempotencyState) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = state
	return nil
}

// inMemoryUnitOfWork simulates atomic failure persistence without a real DB transaction.
type inMemoryUnitOfWork struct {
	repo  *inMemoryPaymentRepo
	store *inMemoryIdempotencyStore
}

func (u *inMemoryUnitOfWork) FailPayment(ctx context.Context, p *payment.Payment, key string) error {
	if err := u.repo.Save(ctx, p); err != nil {
		return err
	}
	return u.store.Update(ctx, key, payment.IdempotencyFailed)
}

// stubProvider returns a fixed result for deterministic tests.
type stubProvider struct {
	result payment.ProviderResult
	err    error
}

func (s *stubProvider) Process(_ context.Context, _ string, _ int64) (payment.ProviderResult, error) {
	return s.result, s.err
}

// --- helpers ---

func makeCmd() commands.ProcessPayment {
	return commands.ProcessPayment{
		PaymentID:   "pay-1",
		OrderID:     "ord-1",
		UserID:      "user-1",
		AmountCents: 5000,
		Currency:    "BRL",
		Attempt:     1,
	}
}

func buildHandler(
	repo *inMemoryPaymentRepo,
	store *inMemoryIdempotencyStore,
	provider payment.PaymentProvider,
) *handlers.ProcessPaymentHandler {
	uow := &inMemoryUnitOfWork{repo: repo, store: store}
	producer, err := kafka.NewProducer("") // empty brokers → no-op mode; publish calls log and return nil
	if err != nil {
		panic(fmt.Sprintf("producer: %v", err))
	}
	return handlers.NewProcessPaymentHandler(repo, store, uow, provider, producer)
}

// --- tests ---

func TestProcessPaymentHandler_IdempotencyCompleted(t *testing.T) {
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	key := payment.IdempotencyKey("ord-1", 1)
	store.data[key] = payment.IdempotencyCompleted

	h := buildHandler(repo, store, &stubProvider{}) // provider never called

	if err := h.Handle(context.Background(), makeCmd()); err != nil {
		t.Errorf("COMPLETED key: want nil, got %v", err)
	}
	// Repo must remain empty — no second charge attempt.
	if len(repo.data) != 0 {
		t.Errorf("COMPLETED key: repo should be untouched, got %d entries", len(repo.data))
	}
}

func TestProcessPaymentHandler_IdempotencyProcessing(t *testing.T) {
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	key := payment.IdempotencyKey("ord-1", 1)
	store.data[key] = payment.IdempotencyProcessing

	h := buildHandler(repo, store, &stubProvider{})

	err := h.Handle(context.Background(), makeCmd())
	if !errors.Is(err, handlers.ErrAlreadyProcessing) {
		t.Errorf("PROCESSING key: want ErrAlreadyProcessing, got %v", err)
	}
}

func TestProcessPaymentHandler_IdempotencyFailed(t *testing.T) {
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	key := payment.IdempotencyKey("ord-1", 1)
	store.data[key] = payment.IdempotencyFailed

	h := buildHandler(repo, store, &stubProvider{})

	// FAILED is terminal for this attempt — saga retries with attempt+1 (new idempotency key).
	if err := h.Handle(context.Background(), makeCmd()); err != nil {
		t.Errorf("FAILED key: want nil, got %v", err)
	}
	if len(repo.data) != 0 {
		t.Errorf("FAILED key: repo should be untouched, got %d entries", len(repo.data))
	}
}

func TestProcessPaymentHandler_ProviderSuccess(t *testing.T) {
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	provider := &stubProvider{
		result: payment.ProviderResult{Authorized: true, Captured: true},
	}
	h := buildHandler(repo, store, provider)

	if err := h.Handle(context.Background(), makeCmd()); err != nil {
		t.Fatalf("provider success: want nil, got %v", err)
	}

	key := payment.IdempotencyKey("ord-1", 1)
	if store.data[key] != payment.IdempotencyCompleted {
		t.Errorf("idempotency key: want COMPLETED, got %s", store.data[key])
	}
	p, err := repo.FindByID(context.Background(), "pay-1")
	if err != nil {
		t.Fatalf("payment not saved: %v", err)
	}
	if p.Status() != payment.StatusCompleted {
		t.Errorf("payment status: want COMPLETED, got %s", p.Status())
	}
}

func TestProcessPaymentHandler_ProviderDeclined(t *testing.T) {
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	provider := &stubProvider{
		result: payment.ProviderResult{Declined: true, Reason: "card declined"},
	}
	h := buildHandler(repo, store, provider)

	err := h.Handle(context.Background(), makeCmd())
	if err == nil {
		t.Fatal("provider declined: want error, got nil")
	}

	key := payment.IdempotencyKey("ord-1", 1)
	if store.data[key] != payment.IdempotencyFailed {
		t.Errorf("idempotency key: want FAILED, got %s", store.data[key])
	}
	p, findErr := repo.FindByID(context.Background(), "pay-1")
	if findErr != nil {
		t.Fatalf("payment not saved after decline: %v", findErr)
	}
	if p.Status() != payment.StatusFailed {
		t.Errorf("payment status: want FAILED, got %s", p.Status())
	}
	if p.FailureReason() != "card declined" {
		t.Errorf("failure reason: want 'card declined', got %q", p.FailureReason())
	}
}

func TestProcessPaymentHandler_ProviderCaptureFailure(t *testing.T) {
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	provider := &stubProvider{
		result: payment.ProviderResult{Authorized: true, Captured: false, Reason: "capture timeout"},
	}
	h := buildHandler(repo, store, provider)

	if err := h.Handle(context.Background(), makeCmd()); err == nil {
		t.Fatal("capture failure: want error, got nil")
	}

	key := payment.IdempotencyKey("ord-1", 1)
	if store.data[key] != payment.IdempotencyFailed {
		t.Errorf("idempotency key: want FAILED, got %s", store.data[key])
	}
	p, findErr := repo.FindByID(context.Background(), "pay-1")
	if findErr != nil {
		t.Fatalf("payment not saved after capture failure: %v", findErr)
	}
	if p.Status() != payment.StatusFailed {
		t.Errorf("payment status: want FAILED, got %s", p.Status())
	}
}

func TestProcessPaymentHandler_ConcurrentInsertRace(t *testing.T) {
	// Two goroutines race to handle the same payment — exactly one must proceed,
	// the other must return ErrAlreadyProcessing.
	repo := newPaymentRepo()
	store := newIdempotencyStore()
	provider := &stubProvider{
		result: payment.ProviderResult{Authorized: true, Captured: true},
	}
	h := buildHandler(repo, store, provider)
	cmd := makeCmd()

	errs := make([]error, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	for i := range errs {
		i := i
		go func() {
			defer wg.Done()
			errs[i] = h.Handle(context.Background(), cmd)
		}()
	}
	wg.Wait()

	processingErrors := 0
	for _, err := range errs {
		if errors.Is(err, handlers.ErrAlreadyProcessing) {
			processingErrors++
		}
	}
	if processingErrors == 0 {
		t.Error("concurrent race: expected at least one ErrAlreadyProcessing, got none")
	}
}
