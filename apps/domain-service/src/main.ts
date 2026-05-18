import 'reflect-metadata';
import { Pool } from 'pg';
import { PostgresStockReservationRepository } from './infrastructure/postgres/StockReservationRepository';
import { PostgresCartRepository } from './infrastructure/postgres/CartRepository';
import { WooCommerceGraphQLAdapter } from './infrastructure/woocommerce/WooCommerceGraphQLAdapter';
import { ReserveStockHandler } from './application/handlers/ReserveStockHandler';
import { ReleaseStockHandler } from './application/handlers/ReleaseStockHandler';
import { AddToCartHandler } from './application/handlers/AddToCartHandler';
import { StockProducer } from './infrastructure/kafka/producer';
import { StockConsumer } from './infrastructure/kafka/consumer';
import { startGraphQLServer } from './infrastructure/graphql/server';

const port = Number(process.env.PORT ?? 3002);
const brokers = process.env.KAFKA_BROKERS ?? 'localhost:9092';
const groupID = process.env.KAFKA_GROUP_ID ?? 'domain-service';
const databaseURL =
  process.env.DATABASE_URL ?? 'postgresql://domain_user:domain_pass@localhost:5433/domain_db';
const wooUrl =
  process.env.WOO_GRAPHQL_URL ?? 'http://wordpress:8080/graphql';

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: databaseURL });

  const stockReservations = new PostgresStockReservationRepository(pool);
  await stockReservations.migrate();

  const cartRepository = new PostgresCartRepository(pool);
  await cartRepository.migrate();

  const wooCommerce = new WooCommerceGraphQLAdapter(wooUrl);

  const addToCartHandler = new AddToCartHandler(cartRepository, wooCommerce);
  await startGraphQLServer(wooCommerce, addToCartHandler, port);

  const producer = new StockProducer(brokers);
  await producer.connect();

  const reserveStockHandler = new ReserveStockHandler(wooCommerce, stockReservations);
  const releaseStockHandler = new ReleaseStockHandler(wooCommerce, stockReservations);
  const consumer = new StockConsumer(brokers, groupID, reserveStockHandler, releaseStockHandler, producer);

  const shutdown = async (): Promise<void> => {
    console.log('[domain-service] shutting down...');
    await consumer.stop();
    await producer.disconnect();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await consumer.start();
}

main().catch((err) => {
  console.error('[domain-service] fatal startup error', err);
  process.exit(1);
});
