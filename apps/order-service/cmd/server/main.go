package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/teste-manuel/order-service/internal/application/handlers"
	"github.com/teste-manuel/order-service/internal/infrastructure/fraud"
	gqlhandler "github.com/teste-manuel/order-service/internal/infrastructure/graphql"
	"github.com/teste-manuel/order-service/internal/infrastructure/kafka"
	"github.com/teste-manuel/order-service/internal/infrastructure/postgres"
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
	repo := postgres.NewOrderRepository(pool)
	producer, err := kafka.NewProducer(brokers)
	if err != nil {
		log.Fatalf("kafka producer: %v", err)
	}
	defer producer.Close()
	fraudClient := fraud.NewClient(mustEnv("FRAUD_SIDECAR_URL"))

	placeHandler := handlers.NewPlaceOrderHandler(repo, producer)
	confirmHandler := handlers.NewConfirmOrderHandler(repo, producer)
	cancelHandler := handlers.NewCancelOrderHandler(repo, producer)
	stockReservedHandler := handlers.NewStockReservedHandler(repo, fraudClient, producer)
	getHandler := handlers.NewGetOrderHandler(repo)
	getByUserHandler := handlers.NewGetOrdersByUserHandler(repo)

	consumer := kafka.NewConsumer(brokers, "order-service", confirmHandler, cancelHandler, stockReservedHandler)
	go func() {
		if err := consumer.Start(ctx); err != nil {
			log.Printf("kafka consumer error: %v", err)
		}
	}()

	handler := gqlhandler.NewHandler(placeHandler, getHandler, getByUserHandler)

	port := getEnv("PORT", "3003")
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.Handle("/graphql", handler)

	log.Printf("order-service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS orders (
			id              TEXT PRIMARY KEY,
			user_id         TEXT NOT NULL,
			items           JSONB NOT NULL,
			total_cents     BIGINT NOT NULL,
			currency        TEXT NOT NULL DEFAULT 'BRL',
			status          TEXT NOT NULL,
			fraud_report    JSONB,
			payment_attempt SMALLINT NOT NULL DEFAULT 0,
			created_at      TIMESTAMPTZ NOT NULL,
			updated_at      TIMESTAMPTZ NOT NULL
		);
		ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_attempt SMALLINT NOT NULL DEFAULT 0;
		CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
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
