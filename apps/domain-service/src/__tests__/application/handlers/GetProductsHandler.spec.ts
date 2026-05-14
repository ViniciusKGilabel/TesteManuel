import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { GetProductsHandler } from '../../../application/handlers/GetProductsHandler';
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

function makeProduct(id: string, name: string, price: number, stock: number): Product {
  return Product.reconstitute({
    id,
    name,
    description: 'desc',
    price: Price.create(price),
    stock: Stock.create(stock),
    createdAt: new Date(),
  });
}

describe('GetProductsHandler', () => {
  let repo: MockProductRepository;
  let handler: GetProductsHandler;

  beforeEach(() => {
    repo = new MockProductRepository();
    handler = new GetProductsHandler(repo);
  });

  it('returns empty array when repository is empty', async () => {
    const result = await handler.handle({});
    expect(result).toHaveLength(0);
  });

  it('returns a DTO for a single product', async () => {
    await repo.save(makeProduct('prod-1', 'Widget', 10, 100));

    const result = await handler.handle({});

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('prod-1');
    expect(result[0].name).toBe('Widget');
    expect(result[0].price).toBe(10);
    expect(result[0].stock).toBe(100);
  });

  it('returns DTOs for all products in the repository', async () => {
    await repo.save(makeProduct('prod-1', 'Widget', 10, 50));
    await repo.save(makeProduct('prod-2', 'Gadget', 20, 30));

    const result = await handler.handle({});

    expect(result).toHaveLength(2);
    const ids = result.map((p) => p.id).sort();
    expect(ids).toEqual(['prod-1', 'prod-2']);
  });

  it('maps price and currency correctly', async () => {
    await repo.save(makeProduct('prod-1', 'Widget', 9.99, 5));

    const result = await handler.handle({});

    expect(result[0].price).toBe(9.99);
    expect(result[0].currency).toBeDefined();
  });

  it('maps stock quantity correctly', async () => {
    await repo.save(makeProduct('prod-1', 'Widget', 10, 42));

    const result = await handler.handle({});

    expect(result[0].stock).toBe(42);
  });
});
