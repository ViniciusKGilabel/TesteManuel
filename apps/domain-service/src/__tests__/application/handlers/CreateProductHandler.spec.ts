import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { CreateProductHandler } from '../../../application/handlers/CreateProductHandler';
import { CreateProductCommand } from '../../../application/commands/CreateProductCommand';
import { IProductRepository } from '../../../domain/product/IProductRepository';
import { Product } from '../../../domain/product/entities/Product';

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
    return all.find((p) => p.productName === name) || null;
  }
}

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let repository: MockProductRepository;

  beforeEach(() => {
    repository = new MockProductRepository();
    handler = new CreateProductHandler(repository);
  });

  it('should create a product and return DTO', async () => {
    const command = new CreateProductCommand('Laptop', 'High-performance laptop', 4999.99, 10);
    const result = await handler.handle(command);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Laptop');
    expect(result.description).toBe('High-performance laptop');
    expect(result.price).toBe(4999.99);
    expect(result.stock).toBe(10);
    expect(result.currency).toBe('BRL');
  });

  it('should persist product in repository', async () => {
    const command = new CreateProductCommand('Phone', 'Smartphone', 2499.99, 50);
    const result = await handler.handle(command);

    const saved = await repository.findById(result.id);
    expect(saved).not.toBeNull();
    expect(saved!.productName).toBe('Phone');
  });

  it('should throw for empty product name', async () => {
    const command = new CreateProductCommand('', 'desc', 100, 5);
    await expect(handler.handle(command)).rejects.toThrow('Product name cannot be empty');
  });

  it('should throw for negative price', async () => {
    const command = new CreateProductCommand('Widget', 'desc', -10, 5);
    await expect(handler.handle(command)).rejects.toThrow('Price amount cannot be negative');
  });

  it('should throw for negative stock', async () => {
    const command = new CreateProductCommand('Widget', 'desc', 10, -1);
    await expect(handler.handle(command)).rejects.toThrow(
      'Stock quantity must be a non-negative integer'
    );
  });

  it('should use custom currency', async () => {
    const command = new CreateProductCommand('Widget', 'desc', 100, 5, 'USD');
    const result = await handler.handle(command);
    expect(result.currency).toBe('USD');
  });
});
