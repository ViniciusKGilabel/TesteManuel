# TesteManuel — Polyglot E-Commerce Monorepo

A full-stack e-commerce platform built as a reference implementation for modern distributed systems patterns. Five languages, one monorepo, production-grade architecture.

---

## Why This Project Exists

Most architecture demos pick one language and one pattern. This project deliberately spans multiple runtimes and paradigms to show how they can coexist and communicate cleanly in a single system:

- **Domain-Driven Design** — every bounded context owns its aggregate roots, value objects, and repository interfaces with no leakage across service boundaries
- **CQRS** — read and write paths are separate from the command/query layer down to the handler; no fat service objects
- **Saga Choreography** — async inter-service coordination over Kafka with no central coordinator; each service reacts to events and publishes its own; a compacted `saga-state` topic provides observability
- **GraphQL Federation v2** — a single Apollo Gateway stitches together schemas from five independent services (including WordPress) with zero shared code between subgraphs
- **Idempotent Payments** — SHA-256 keyed idempotency store guards against double-charge under saga retries; PROCESSING/COMPLETED/FAILED state machine enforced at the database level
- **AI-augmented fraud detection** — LangChain LCEL chain calls Claude synchronously in the order flow; the chain is fully testable with a stub LLM, no real API key needed in tests

---

## Architecture

```
                        ┌─────────────────────────────┐
                        │   Apollo Federation Gateway  │
                        │         :4000                │
                        └──────────┬──────────────────┘
                                   │ GraphQL Federation
          ┌────────────┬───────────┼──────────────────┐
          ▼            ▼           ▼                   ▼
   auth-service  domain-service  order-service    wordpress
     :3001          :3002          :3003            :8080
   NestJS +       NestJS +       Go + gqlgen     WP-GraphQL +
   BetterAuth      CQRS          + Saga           Federation
   Postgres        Postgres       Postgres         MySQL
                                     │
                              ┌──────┴──────┐
                              │  Kafka Bus  │
                              │   :9092     │
                              └──────┬──────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                 payment-service           fraud-sidecar
                    :3004                     :3005
                 Go + Postgres             Python + FastAPI
                 Idempotent                LangChain →
                 Payments                 Claude (Anthropic)

   Frontend: Next.js 15 + Apollo Client + Tailwind  :3000
```

### Bounded Contexts

| Context | Service | Language | Persistence |
|---|---|---|---|
| User / Session | auth-service | TypeScript | Postgres |
| Product + Cart | domain-service | TypeScript | Postgres |
| Order + Saga | order-service | Go | Postgres |
| Payment | payment-service | Go | Postgres |
| Fraud Detection | fraud-sidecar | Python | stateless |
| CMS Content | wordpress | PHP | MySQL |

### Shared Libraries (`libs/`)

| Library | Purpose |
|---|---|
| `@teste-manuel/domain` | Base `Entity<T>` and `ValueObject<T>` types |
| `@teste-manuel/shared` | Cross-service TypeScript types and utilities |
| `@teste-manuel/graphql` | Shared GraphQL scalars and federation helpers |

---

## Saga Flow

Order placement is coordinated by Kafka events with no central orchestrator.

**Happy path**

```
order-service     → order.placed
domain-service    → stock.reserved
order-service     → (calls fraud-sidecar via HTTP) → fraud.check.completed
order-service     → payment.requested
payment-service   → payment.processed
order-service     → order.confirmed
```

**Compensation**

| Trigger | Action |
|---|---|
| `stock.reservation.failed` | Order cancelled → `order.cancelled` |
| `fraud.check.completed` HIGH/CRITICAL | Order cancelled → `order.cancelled` + `stock.release.requested` |
| `payment.failed` | Order cancelled → `order.cancelled` + `stock.release.requested` |

**Kafka topics** (3 partitions, 7-day retention; `saga-state` is compacted):

`order.placed` · `order.confirmed` · `order.cancelled` · `stock.reserved` · `stock.reservation.failed` · `stock.release.requested` · `fraud.check.completed` · `payment.requested` · `payment.processed` · `payment.failed` · `saga-state`

---

## Prerequisites

| Tool | Version | Required for |
|---|---|---|
| Docker + Compose | 24+ | Full stack |
| Node.js | 20+ | TypeScript services (no Docker) |
| pnpm | 9+ | TypeScript services (no Docker) |
| Go | 1.22+ | Go services (no Docker) |
| Python | 3.12 | Fraud sidecar (no Docker) |

---

## Running with Docker

### 1. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your Anthropic API key — the fraud-sidecar will not start without it:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

The other values in `.env.example` are pre-filled with dev defaults that match `docker-compose.yml`.

### 2. Start everything

```bash
docker-compose up
```

First run takes a few minutes while images build and WordPress bootstraps itself via WP-CLI.

### 3. Verify services

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| GraphQL Gateway (Playground) | http://localhost:4000/graphql |
| auth-service | http://localhost:3001/graphql |
| domain-service | http://localhost:3002/graphql |
| order-service | http://localhost:3003/graphql |
| payment-service | http://localhost:3004 |
| fraud-sidecar | http://localhost:3005/docs |
| WordPress | http://localhost:8080 |
| WordPress Admin | http://localhost:8080/wp-admin |
| Kafka | localhost:9092 |

WordPress admin credentials: `admin` / `admin_pass` (override via `.env`).

### 4. Stop

```bash
# Stop containers, keep volumes (data survives restart)
docker-compose down

# Stop and delete all persisted data
docker-compose down -v
```

### 5. Rebuild a single service after code changes

```bash
docker-compose up --build auth-service
```

---

## Running Services Without Docker

Use this approach during development when you want fast iteration on a single service. You still need the databases and Kafka running — bring up only the infrastructure containers first:

```bash
docker-compose up auth-db domain-db order-db payment-db wp-db zookeeper kafka
```

### auth-service (NestJS · TypeScript)

```bash
# From repo root — install once
pnpm install

cd apps/auth-service
pnpm dev
```

Environment variables:

```env
PORT=3001
DATABASE_URL=postgresql://auth_user:auth_pass@localhost:5432/auth_db
JWT_SECRET=dev-jwt-secret-change-in-prod
```

Run tests:

```bash
# From repo root
node node_modules/.bin/jest --config apps/auth-service/jest.config.ts --watch
```

---

### domain-service (NestJS · TypeScript)

```bash
cd apps/domain-service
pnpm dev
```

Environment variables:

```env
PORT=3002
DATABASE_URL=postgresql://domain_user:domain_pass@localhost:5433/domain_db
KAFKA_BROKERS=localhost:9092
```

Run tests:

```bash
node node_modules/.bin/jest --config apps/domain-service/jest.config.ts --watch
```

---

### order-service (Go · gqlgen)

```bash
cd apps/order-service
go run ./cmd/server/main.go
```

Environment variables:

```env
PORT=3003
DATABASE_URL=postgresql://order_user:order_pass@localhost:5434/order_db
KAFKA_BROKERS=localhost:9092
FRAUD_SIDECAR_URL=http://localhost:3005
```

Run tests:

```bash
cd apps/order-service
go test ./...

# With HTML coverage report
go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out
```

---

### payment-service (Go)

```bash
cd apps/payment-service
go run ./cmd/server/main.go
```

Environment variables:

```env
PORT=3004
DATABASE_URL=postgresql://payment_user:payment_pass@localhost:5435/payment_db
KAFKA_BROKERS=localhost:9092
```

Run tests:

```bash
cd apps/payment-service
go test ./...
```

---

### fraud-sidecar (Python · FastAPI)

Python 3.12 is required. Use a virtual environment to avoid conflicts with your system Python.

```bash
cd apps/fraud-sidecar

python3.12 -m venv .venv
source .venv/bin/activate       # on Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

Environment variables:

```env
PORT=3005
ANTHROPIC_API_KEY=sk-ant-...
KAFKA_BROKERS=localhost:9092
```

Start the server:

```bash
uvicorn main:app --host 0.0.0.0 --port 3005 --reload
```

Run tests (no real API key needed — tests use a stub LLM):

```bash
pytest
```

Interactive API docs: http://localhost:3005/docs

---

### gateway (Apollo Federation · TypeScript)

The gateway requires all subgraph services to be reachable before it can compose the supergraph.

```bash
cd apps/gateway
pnpm dev
```

Environment variables:

```env
GATEWAY_PORT=4000
AUTH_SERVICE_URL=http://localhost:3001/graphql
DOMAIN_SERVICE_URL=http://localhost:3002/graphql
ORDER_SERVICE_URL=http://localhost:3003/graphql
WORDPRESS_SERVICE_URL=http://localhost:8080/graphql
```

---

### frontend (Next.js 15)

```bash
cd apps/frontend
pnpm dev
```

Environment variables:

```env
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000/graphql
GATEWAY_URL=http://localhost:4000/graphql
```

Runs at http://localhost:3000.

---

### wordpress (WP-GraphQL Federation)

WordPress requires Apache and PHP, making it the most complex service to run outside Docker. Docker is strongly recommended for this one. If you need a local PHP environment, install [WP-CLI](https://wp-cli.org/#installing) and then run `apps/wordpress/setup.sh` after WordPress core is installed.

---

## Testing

| Service | Command | Coverage target |
|---|---|---|
| auth-service | `node node_modules/.bin/jest --config apps/auth-service/jest.config.ts --ci --coverage` | 90%+ |
| domain-service | `node node_modules/.bin/jest --config apps/domain-service/jest.config.ts --ci --coverage` | 90%+ |
| order-service | `cd apps/order-service && go test ./...` | 90%+ domain + handler |
| payment-service | `cd apps/payment-service && go test ./...` | 90%+ idempotency |
| fraud-sidecar | `cd apps/fraud-sidecar && pytest` | 85%+ chain + thresholds |

**Key testing rule:** never mock the database. Use in-memory repositories that implement the same interface as the real one. See `apps/auth-service/src/__tests__/application/handlers/MockUserRepository.ts` for the composition pattern used throughout.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs four jobs on every push:

| Job | What it runs |
|---|---|
| `lint-and-test` | Jest for auth-service + domain-service with Codecov upload |
| `build` | `tsc` compile check for all TypeScript services |
| `test-go` | `go test ./...` for order-service and payment-service |
| `test-python` | `pytest` for fraud-sidecar |
| `docker` | Builds all Docker images (main branch only, after all tests pass) |

---

## Project Structure

```
.
├── apps/
│   ├── auth-service/        # NestJS — User auth + BetterAuth sessions
│   ├── domain-service/      # NestJS — Products and Cart (CQRS + DDD)
│   ├── order-service/       # Go — Orders + Saga choreography (gqlgen)
│   ├── payment-service/     # Go — Idempotent payments + mock provider
│   ├── fraud-sidecar/       # Python — FastAPI + LangChain → Claude
│   ├── gateway/             # Apollo Federation Gateway
│   ├── frontend/            # Next.js 15 + Apollo Client + Tailwind
│   └── wordpress/           # WP-GraphQL Federation subgraph
├── libs/
│   ├── domain/              # Base Entity and ValueObject types
│   ├── shared/              # Cross-service TypeScript types and utils
│   └── graphql/             # Shared GraphQL scalars and helpers
├── docs/
│   └── superpowers/
│       ├── specs/           # Architecture design documents
│       └── plans/           # Phase-by-phase implementation plans
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                # Developer and AI assistant instructions
├── nx.json
└── package.json
```

**TypeScript service layout (auth-service, domain-service)**

```
src/
├── domain/
│   └── <context>/
│       ├── entities/        # Aggregate roots
│       ├── value-objects/   # Immutable value types
│       ├── events/          # Domain events
│       └── I<X>Repository.ts
├── application/
│   ├── commands/            # Write-side DTOs
│   ├── queries/             # Read-side DTOs
│   ├── handlers/            # Command and query handlers
│   └── dto/
└── infrastructure/
    ├── persistence/         # Repository implementations
    └── graphql/             # Resolvers and schema
```

**Go service layout (order-service, payment-service)**

```
internal/
├── domain/          # Pure domain model — no framework dependencies
├── application/     # Use cases and command handlers
└── infrastructure/  # Postgres, Kafka, HTTP clients
cmd/server/main.go   # Dependency wiring only — no business logic
```
