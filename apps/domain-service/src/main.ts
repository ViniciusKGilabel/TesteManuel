import 'reflect-metadata';
import { IProductRepository } from './domain/product/IProductRepository';
import { Product } from './domain/product/entities/Product';
import { ReserveStockHandler } from './application/handlers/ReserveStockHandler';
import { ReleaseStockHandler } from './application/handlers/ReleaseStockHandler';
import { StockProducer } from './infrastructure/kafka/producer';
import { StockConsumer } from './infrastructure/kafka/consumer';

const brokers = process.env.KAFKA_BROKERS ?? 'localhost:9092';
const groupID = process.env.KAFKA_GROUP_ID ?? 'domain-service';

// Stub — replace with Postgres IProductRepository implementation when adding persistence.
class StubProductRepository implements IProductRepository {
  private store = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.store.set(product.productId, product);
  }

  async findById(id: string): Promise<Product | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async findAll(): Promise<Product[]> {
    return [...this.store.values()];
  }

  async findByName(name: string): Promise<Product | null> {
    for (const p of this.store.values()) {
      if (p.productName === name) return p;
    }
    return null;
  }
}

async function main(): Promise<void> {
  const productRepository: IProductRepository = new StubProductRepository();
  const producer = new StockProducer(brokers);
  await producer.connect();

  const reserveStockHandler = new ReserveStockHandler(productRepository);
  const releaseStockHandler = new ReleaseStockHandler(productRepository);
  const consumer = new StockConsumer(brokers, groupID, reserveStockHandler, releaseStockHandler, producer);

  const shutdown = async (): Promise<void> => {
    console.log('[domain-service] shutting down...');
    await consumer.stop();
    await producer.disconnect();
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
