import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { ReleaseStockHandler } from '../../../application/handlers/ReleaseStockHandler';
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

describe('ReleaseStockHandler', () => {
  let repo: MockProductRepository;
  let handler: ReleaseStockHandler;

  beforeEach(() => {
    repo = new MockProductRepository();
    handler = new ReleaseStockHandler(repo);
  });

  it('replenishes stock for a single item', async () => {
    await repo.save(makeProduct('prod-1', 40));

    await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: 'prod-1', quantity: 10 }],
    });

    const saved = await repo.findById('prod-1');
    expect(saved!.productStock.quantity).toBe(50);
  });

  it('replenishes stock for multiple items', async () => {
    await repo.save(makeProduct('prod-1', 10));
    await repo.save(makeProduct('prod-2', 20));

    await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 8 },
      ],
    });

    expect((await repo.findById('prod-1'))!.productStock.quantity).toBe(15);
    expect((await repo.findById('prod-2'))!.productStock.quantity).toBe(28);
  });

  it('skips missing products without throwing', async () => {
    await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: 'gone', quantity: 5 }],
    });
    // no error — compensation is best-effort
  });

  it('processes remaining items even when one is missing', async () => {
    await repo.save(makeProduct('prod-2', 10));

    await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: 'missing', quantity: 5 },
        { productId: 'prod-2', quantity: 3 },
      ],
    });

    expect((await repo.findById('prod-2'))!.productStock.quantity).toBe(13);
  });
});
