import { ReserveStockHandler } from '../../../application/handlers/ReserveStockHandler';
import { IWooCommercePort, WooProductData } from '../../../application/ports/IWooCommercePort';
import { IStockReservationRepository, StockReservationItem } from '../../../domain/stock/IStockReservationRepository';

class MockWooCommerce implements IWooCommercePort {
  private stocks = new Map<string, number>();
  readonly stockUpdates: Array<{ productId: string; delta: number }> = [];

  setStock(productId: string, qty: number) {
    this.stocks.set(productId, qty);
  }

  async getStockQuantity(productId: string): Promise<number> {
    return this.stocks.get(productId) ?? 0;
  }

  async getProducts(): Promise<WooProductData[]> { return []; }
  async getProduct(_id: string): Promise<WooProductData | null> { return null; }

  async updateStock(productId: string, delta: number): Promise<boolean> {
    const current = this.stocks.get(productId) ?? 0;
    const next = current + delta;
    if (next < 0) return false;
    this.stocks.set(productId, next);
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

describe('ReserveStockHandler', () => {
  let woo: MockWooCommerce;
  let repo: MockReservationRepository;
  let handler: ReserveStockHandler;

  beforeEach(() => {
    woo = new MockWooCommerce();
    repo = new MockReservationRepository();
    handler = new ReserveStockHandler(woo, repo);
  });

  it('reserves stock and decrements WooCommerce for a single item', async () => {
    woo.setStock('1', 100);
    const result = await handler.handle({ orderID: 'ord-1', items: [{ productId: '1', quantity: 10 }] });
    expect(result.success).toBe(true);
    expect(woo.stockUpdates).toEqual([{ productId: '1', delta: -10 }]);
    expect(repo.getAll()).toHaveLength(1);
    expect(repo.getAll()[0]).toMatchObject({ orderId: 'ord-1', productId: '1', quantity: 10 });
  });

  it('reserves stock for multiple items', async () => {
    woo.setStock('1', 50);
    woo.setStock('2', 30);
    const result = await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: '1', quantity: 5 }, { productId: '2', quantity: 3 }],
    });
    expect(result.success).toBe(true);
    expect(woo.stockUpdates).toHaveLength(2);
    expect(repo.getAll()).toHaveLength(2);
  });

  it('returns failure when product has no stock in WooCommerce', async () => {
    const result = await handler.handle({ orderID: 'ord-1', items: [{ productId: '99', quantity: 1 }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toContain('99');
    expect(woo.stockUpdates).toHaveLength(0);
  });

  it('returns failure when stock is insufficient', async () => {
    woo.setStock('1', 5);
    const result = await handler.handle({ orderID: 'ord-1', items: [{ productId: '1', quantity: 10 }] });
    expect(result.success).toBe(false);
    expect(woo.stockUpdates).toHaveLength(0);
  });

  it('does not create any reservation when stock is insufficient', async () => {
    woo.setStock('1', 5);
    await handler.handle({ orderID: 'ord-1', items: [{ productId: '1', quantity: 10 }] });
    expect(repo.getAll()).toHaveLength(0);
  });

  it('rolls back WooCommerce decrements when a later item fails', async () => {
    woo.setStock('1', 100);
    woo.setStock('2', 1);
    const result = await handler.handle({
      orderID: 'ord-1',
      items: [{ productId: '1', quantity: 10 }, { productId: '2', quantity: 5 }],
    });
    expect(result.success).toBe(false);
    expect(repo.getAll()).toHaveLength(0);
    // product 1 was decremented then rolled back: net delta = 0
    const net1 = woo.stockUpdates
      .filter((u) => u.productId === '1')
      .reduce((s, u) => s + u.delta, 0);
    expect(net1).toBe(0);
  });

  it('is idempotent — second call for same order returns success without double-decrement', async () => {
    woo.setStock('1', 100);
    await handler.handle({ orderID: 'ord-1', items: [{ productId: '1', quantity: 10 }] });
    const result = await handler.handle({ orderID: 'ord-1', items: [{ productId: '1', quantity: 10 }] });
    expect(result.success).toBe(true);
    // WooCommerce should only have been decremented once
    expect(woo.stockUpdates.filter((u) => u.delta < 0)).toHaveLength(1);
  });

  it('returns success when all items have sufficient stock', async () => {
    woo.setStock('1', 20);
    woo.setStock('2', 20);
    woo.setStock('3', 20);
    const result = await handler.handle({
      orderID: 'ord-1',
      items: [
        { productId: '1', quantity: 5 },
        { productId: '2', quantity: 5 },
        { productId: '3', quantity: 5 },
      ],
    });
    expect(result.success).toBe(true);
    expect(repo.getAll()).toHaveLength(3);
  });
});
