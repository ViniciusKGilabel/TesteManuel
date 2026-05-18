import { ReleaseStockHandler } from '../../../application/handlers/ReleaseStockHandler';
import { IWooCommercePort, WooProductData } from '../../../application/ports/IWooCommercePort';
import { IStockReservationRepository } from '../../../domain/stock/IStockReservationRepository';
import { StockReservation } from '../../../domain/stock/entities/StockReservation';

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
  private reservations: StockReservation[] = [];

  async getByOrderId(orderId: string): Promise<StockReservation[]> {
    return this.reservations.filter((r) => r.orderId === orderId);
  }

  async reserve(items: StockReservation[]): Promise<void> {
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
      StockReservation.create('ord-1', '1', 5),
      StockReservation.create('ord-1', '2', 3),
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
      StockReservation.create('ord-1', '1', 5),
      StockReservation.create('ord-2', '1', 3),
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
