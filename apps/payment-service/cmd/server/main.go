package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/teste-manuel/payment-service/internal/application/handlers"
	"github.com/teste-manuel/payment-service/internal/infrastructure/kafka"
	"github.com/teste-manuel/payment-service/internal/infrastructure/mock_provider"
	"github.com/teste-manuel/payment-service/internal/infrastructure/postgres"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	if err := runMigrations(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	brokers := mustEnv("KAFKA_BROKERS")
	repo := postgres.NewPaymentRepository(pool)
	store := postgres.NewIdempotencyStore(pool)
	uow := postgres.NewUnitOfWork(pool)
	provider := mock_provider.New()
	producer, err := kafka.NewProducer(brokers)
	if err != nil {
		log.Fatalf("kafka producer: %v", err)
	}
	defer producer.Close()

	handler := handlers.NewProcessPaymentHandler(repo, store, uow, provider, producer)
	consumer := kafka.NewConsumer(brokers, "payment-service", handler)

	go func() {
		if err := consumer.Start(ctx); err != nil {
			log.Printf("kafka consumer error: %v", err)
		}
	}()

	port := getEnv("PORT", "3004")
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	log.Printf("payment-service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS payments (
			id              TEXT PRIMARY KEY,
			order_id        TEXT NOT NULL,
			user_id         TEXT NOT NULL,
			amount_cents    BIGINT NOT NULL,
			currency        TEXT NOT NULL DEFAULT 'BRL',
			idempotency_key TEXT NOT NULL UNIQUE,
			status          TEXT NOT NULL,
			failure_reason  TEXT NOT NULL DEFAULT '',
			created_at      TIMESTAMPTZ NOT NULL,
			updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS idempotency_keys (
			key        TEXT PRIMARY KEY,
			state      TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ
		);
	`)
	return err
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
