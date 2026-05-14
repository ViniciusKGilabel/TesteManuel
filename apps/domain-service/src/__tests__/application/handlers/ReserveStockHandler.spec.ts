import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { ReserveStockHandler } from '../../../application/handlers/ReserveStockHandler';
import { IProductRepository } from '../../../domain/product/IProductRepository';
import { Product } from '../../../domain/product/entities/Product';
import { Price } from '../../../domain/product/value-objects/Price';
import { Stock } from '../../../domain/product/value-objects/Stock';

class MockProductRepository implements IProductRepository {
  private store = new InMemoryRepository<Product>();

  async save(product: Product): Promise<void> {
    await this.store.save(product.productId, product);
  }

  async findById(id: string): Promise<Product | null> {
    return this.store.findById(id);
  }

  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }

  async findAll(): Promise<Product[]> {
    return this.store.findAll();
  }

  async findByName(name: string): Promise<Product | null> {
    const all = await this.store.findAll();
    return all.find((p) => p.productName === name) ?? null;
  }
}

function makeProduct(id: string, stock: number): Product {
  return Product.reconstitute({
    id,
    name: 'Widget',
    description: 'desc',
    price: Price.create(10),
    stock: Stock.create(stock),
    createdAt: new Date(),
  });
}

describe('ReserveStockHandler', () => {
  let repo: MockProductRepository;
  let handler: ReserveStockHandler;

  beforeEach(() => {
    repo = new MockProductRepository();
    handler = new ReserveStockHandler(repo);
  });

  it('reserves stock for a single item and returns success', async () => {
    await repo.save(makeProduct('prod-1', 100));

    const result = await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: 'prod-1', quantity: 10 }],
    });

    expect(result.success).toBe(true);
    const saved = await repo.findById('prod-1');
    expect(saved!.productStock.quantity).toBe(90);
  });

  it('reserves stock for multiple items', async () => {
    await repo.save(makeProduct('prod-1', 50));
    await repo.save(makeProduct('prod-2', 30));

    const result = await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 3 },
      ],
    });

    expect(result.success).toBe(true);
    expect((await repo.findById('prod-1'))!.productStock.quantity).toBe(45);
    expect((await repo.findById('prod-2'))!.productStock.quantity).toBe(27);
  });

  it('returns failure when product is not found', async () => {
    const result = await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: 'missing-prod', quantity: 1 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain('missing-prod');
    }
  });

  it('returns failure when stock is insufficient', async () => {
    await repo.save(makeProduct('prod-1', 5));

    const result = await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: 'prod-1', quantity: 10 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('Insufficient stock');
    }
  });

  it('does not persist the reservation when stock is insufficient', async () => {
    await repo.save(makeProduct('prod-1', 5));

    await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: 'prod-1', quantity: 10 }],
    });

    const saved = await repo.findById('prod-1');
    expect(saved!.productStock.quantity).toBe(5);
  });

  it('rolls back item 1 reservation when item 2 has insufficient stock', async () => {
    await repo.save(makeProduct('prod-1', 100));
    await repo.save(makeProduct('prod-2', 1));

    const result = await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-2', quantity: 5 },
      ],
    });

    expect(result.success).toBe(false);
    expect((await repo.findById('prod-1'))!.productStock.quantity).toBe(100);
    expect((await repo.findById('prod-2'))!.productStock.quantity).toBe(1);
  });

  it('rolls back all prior reservations when a later product is not found', async () => {
    await repo.save(makeProduct('prod-1', 50));
    await repo.save(makeProduct('prod-2', 30));

    const result = await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 3 },
        { productId: 'missing-prod', quantity: 1 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain('missing-prod');
    }
    expect((await repo.findById('prod-1'))!.productStock.quantity).toBe(50);
    expect((await repo.findById('prod-2'))!.productStock.quantity).toBe(30);
  });

  it('returns success with no rollback when all items reserve correctly', async () => {
    await repo.save(makeProduct('prod-1', 20));
    await repo.save(makeProduct('prod-2', 20));
    await repo.save(makeProduct('prod-3', 20));

    const result = await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 5 },
        { productId: 'prod-3', quantity: 5 },
      ],
    });

    expect(result.success).toBe(true);
    expect((await repo.findById('prod-1'))!.productStock.quantity).toBe(15);
    expect((await repo.findById('prod-2'))!.productStock.quantity).toBe(15);
    expect((await repo.findById('prod-3'))!.productStock.quantity).toBe(15);
  });
});
