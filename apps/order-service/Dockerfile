FROM golang:1.22-alpine AS builder

RUN apk add --no-cache gcc musl-dev librdkafka-dev pkgconf
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget librdkafka
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 3003
CMD ["./server"]
