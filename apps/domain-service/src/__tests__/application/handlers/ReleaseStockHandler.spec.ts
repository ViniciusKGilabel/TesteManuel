import { ReleaseStockHandler } from '../../../application/handlers/ReleaseStockHandler';
import { IWooCommercePort, WooProductData } from '../../../application/ports/IWooCommercePort';
import { IStockReservationRepository, StockReservationItem } from '../../../domain/stock/IStockReservationRepository';

class MockWooCommerce implements IWooCommercePort {
  readonly stockUpdates: Array<{ productId: string; delta: number }> = [];

  async getStockQuantity(_id: string): Promise<number> { return 0; }
  async getProducts(): Promise<WooProductData[]> { return []; }
  async getProduct(_id: string): Promise<WooProductData | null> { return null; }

  async updateStock(productId: string, delta: number): Promise<boolean> {
    this.stockUpdates.push({ productId, delta });
    return true;
  }
}

class MockReservationRepository implements IStockReservationRepository {
  private reservations: StockReservationItem[] = [];

  async getByOrderId(orderId: string): Promise<StockReservationItem[]> {
    return this.reservations.filter((r) => r.orderId === orderId);
  }

  async reserve(items: StockReservationItem[]): Promise<void> {
    this.reservations.push(...items);
  }

  async release(orderId: string): Promise<void> {
    this.reservations = this.reservations.filter((r) => r.orderId !== orderId);
  }

  getAll() {
    return this.reservations;
  }
}

describe('ReleaseStockHandler', () => {
  let woo: MockWooCommerce;
  let repo: MockReservationRepository;
  let handler: ReleaseStockHandler;

  beforeEach(() => {
    woo = new MockWooCommerce();
    repo = new MockReservationRepository();
    handler = new ReleaseStockHandler(woo, repo);
  });

  it('restores WooCommerce stock and removes reservations for the given order', async () => {
    await repo.reserve([
      { orderId: 'ord-1', productId: '1', quantity: 5 },
      { orderId: 'ord-1', productId: '2', quantity: 3 },
    ]);
    await handler.handle({ orderID: 'ord-1' });

    expect(woo.stockUpdates).toEqual([
      { productId: '1', delta: 5 },
      { productId: '2', delta: 3 },
    ]);
    expect(repo.getAll()).toHaveLength(0);
  });

  it('does not affect reservations from other orders', async () => {
    await repo.reserve([
      { orderId: 'ord-1', productId: '1', quantity: 5 },
      { orderId: 'ord-2', productId: '1', quantity: 3 },
    ]);
    await handler.handle({ orderID: 'ord-1' });
    expect(repo.getAll()).toHaveLength(1);
    expect(repo.getAll()[0].orderId).toBe('ord-2');
  });

  it('handles release of non-existent order without error', async () => {
    await expect(handler.handle({ orderID: 'ord-999' })).resolves.toBeUndefined();
    expect(woo.stockUpdates).toHaveLength(0);
  });
});
