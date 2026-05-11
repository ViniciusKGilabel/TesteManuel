import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { PlaceOrderHandler } from '../../../application/handlers/PlaceOrderHandler';
import { PlaceOrderCommand } from '../../../application/commands/PlaceOrderCommand';
import { CreateProductHandler } from '../../../application/handlers/CreateProductHandler';
import { CreateProductCommand } from '../../../application/commands/CreateProductCommand';
import { IProductRepository } from '../../../domain/product/IProductRepository';
import { IOrderRepository } from '../../../domain/order/IOrderRepository';
import { Product } from '../../../domain/product/entities/Product';
import { Order } from '../../../domain/order/entities/Order';

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

class MockOrderRepository implements IOrderRepository {
  private store = new InMemoryRepository<Order>();

  async save(order: Order): Promise<void> {
    await this.store.save(order.orderId, order);
  }
  async findById(id: string): Promise<Order | null> {
    return this.store.findById(id);
  }
  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }
  async findByUserId(userId: string): Promise<Order[]> {
    const all = await this.store.findAll();
    return all.filter((o) => o.orderUserId === userId);
  }
}

describe('PlaceOrderHandler', () => {
  let placeOrderHandler: PlaceOrderHandler;
  let createProductHandler: CreateProductHandler;
  let productRepository: MockProductRepository;
  let orderRepository: MockOrderRepository;

  beforeEach(() => {
    productRepository = new MockProductRepository();
    orderRepository = new MockOrderRepository();
    placeOrderHandler = new PlaceOrderHandler(orderRepository, productRepository);
    createProductHandler = new CreateProductHandler(productRepository);
  });

  it('should place an order for existing products', async () => {
    const prod = await createProductHandler.handle(
      new CreateProductCommand('Widget', 'desc', 50.00, 100)
    );

    const command = new PlaceOrderCommand('user-1', [{ productId: prod.id, quantity: 2 }]);
    const result = await placeOrderHandler.handle(command);

    expect(result.id).toBeDefined();
    expect(result.userId).toBe('user-1');
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(100.00);
    expect(result.status).toBe('PENDING');
  });

  it('should reserve stock after placing order', async () => {
    const prod = await createProductHandler.handle(
      new CreateProductCommand('Widget', 'desc', 50.00, 10)
    );

    await placeOrderHandler.handle(
      new PlaceOrderCommand('user-1', [{ productId: prod.id, quantity: 3 }])
    );

    const remaining = await productRepository.findById(prod.id);
    expect(remaining!.productStock.quantity).toBe(7);
  });

  it('should throw when product is not found', async () => {
    const command = new PlaceOrderCommand('user-1', [
      { productId: 'non-existent', quantity: 1 },
    ]);
    await expect(placeOrderHandler.handle(command)).rejects.toThrow('Product not found: non-existent');
  });

  it('should throw when stock is insufficient', async () => {
    const prod = await createProductHandler.handle(
      new CreateProductCommand('Widget', 'desc', 50.00, 2)
    );

    const command = new PlaceOrderCommand('user-1', [{ productId: prod.id, quantity: 5 }]);
    await expect(placeOrderHandler.handle(command)).rejects.toThrow(
      'Insufficient stock for product: Widget'
    );
  });

  it('should throw when ordering out-of-stock product', async () => {
    const prod = await createProductHandler.handle(
      new CreateProductCommand('Widget', 'desc', 50.00, 0)
    );

    const command = new PlaceOrderCommand('user-1', [{ productId: prod.id, quantity: 1 }]);
    await expect(placeOrderHandler.handle(command)).rejects.toThrow('Product out of stock: Widget');
  });
});
