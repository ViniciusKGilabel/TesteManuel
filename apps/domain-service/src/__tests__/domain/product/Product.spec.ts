import { Product } from '../../../domain/product/entities/Product';
import { Price } from '../../../domain/product/value-objects/Price';
import { Stock } from '../../../domain/product/value-objects/Stock';
import { ProductCreatedEvent } from '../../../domain/product/events/ProductCreatedEvent';

describe('Product Aggregate', () => {
  const makeProduct = () =>
    Product.create('Widget', 'A test widget', Price.create(29.99), Stock.create(100));

  it('should create a product with valid data', () => {
    const product = makeProduct();
    expect(product.productName).toBe('Widget');
    expect(product.productDescription).toBe('A test widget');
    expect(product.productPrice.amount).toBe(29.99);
    expect(product.productStock.quantity).toBe(100);
    expect(product.productId).toBeDefined();
  });

  it('should publish ProductCreatedEvent on creation', () => {
    const product = makeProduct();
    const events = product.events;
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
    const event = events[0] as ProductCreatedEvent;
    expect(event.name).toBe('Widget');
    expect(event.price).toBe(29.99);
    expect(event.stock).toBe(100);
  });

  it('should throw for empty name', () => {
    expect(() =>
      Product.create('', 'desc', Price.create(10), Stock.create(5))
    ).toThrow('Product name cannot be empty');
  });

  it('should update price', () => {
    const product = makeProduct();
    product.updatePrice(Price.create(49.99));
    expect(product.productPrice.amount).toBe(49.99);
  });

  it('should reserve stock', () => {
    const product = makeProduct();
    product.reserveStock(10);
    expect(product.productStock.quantity).toBe(90);
  });

  it('should throw when reserving more stock than available', () => {
    const product = Product.create('Widget', 'desc', Price.create(10), Stock.create(5));
    expect(() => product.reserveStock(10)).toThrow('Insufficient stock');
  });

  it('should replenish stock', () => {
    const product = makeProduct();
    product.replenishStock(50);
    expect(product.productStock.quantity).toBe(150);
  });

  it('should trim whitespace from name', () => {
    const product = Product.create('  Widget  ', 'desc', Price.create(10), Stock.create(5));
    expect(product.productName).toBe('Widget');
  });

  it('should check equality by id', () => {
    const product = makeProduct();
    expect(product.equals(product)).toBe(true);
  });

  describe('Product.reconstitute', () => {
    it('should reconstitute a product from valid persisted state', () => {
      const product = Product.reconstitute({
        id: 'prod-abc',
        name: 'Widget',
        description: 'A widget',
        price: Price.create(19.99),
        stock: Stock.create(50),
        createdAt: new Date('2026-01-01'),
      });
      expect(product.productId).toBe('prod-abc');
      expect(product.productName).toBe('Widget');
    });

    it('should throw when reconstituting with empty name', () => {
      expect(() =>
        Product.reconstitute({
          id: 'prod-1',
          name: '',
          description: 'desc',
          price: Price.create(10),
          stock: Stock.create(1),
          createdAt: new Date(),
        }),
      ).toThrow('Product name cannot be empty');
    });

    it('should throw when reconstituting with whitespace-only name', () => {
      expect(() =>
        Product.reconstitute({
          id: 'prod-1',
          name: '   ',
          description: 'desc',
          price: Price.create(10),
          stock: Stock.create(1),
          createdAt: new Date(),
        }),
      ).toThrow('Product name cannot be empty');
    });
  });
});
