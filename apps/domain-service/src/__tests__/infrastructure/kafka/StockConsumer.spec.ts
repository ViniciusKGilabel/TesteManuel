import { StockConsumer } from '../../../infrastructure/kafka/consumer';
import { IReserveStockHandler, ReserveStockResult } from '../../../application/handlers/ReserveStockHandler';
import { IReleaseStockHandler } from '../../../application/handlers/ReleaseStockHandler';
import { IStockProducer } from '../../../infrastructure/kafka/producer';

// --- stubs ---

class StubReserveHandler implements IReserveStockHandler {
  result: ReserveStockResult = { success: true };
  received: unknown[] = [];

  async handle(cmd: unknown): Promise<ReserveStockResult> {
    this.received.push(cmd);
    return this.result;
  }
}

class StubReleaseHandler implements IReleaseStockHandler {
  received: unknown[] = [];

  async handle(cmd: unknown): Promise<void> {
    this.received.push(cmd);
  }
}

class StubProducer implements IStockProducer {
  reservedCalls: string[] = [];
  failedCalls: Array<{ orderID: string; reason: string }> = [];
  reservedError: Error | null = null;

  async publishStockReserved(orderID: string): Promise<void> {
    if (this.reservedError) throw this.reservedError;
    this.reservedCalls.push(orderID);
  }

  async publishStockReservationFailed(orderID: string, reason: string): Promise<void> {
    this.failedCalls.push({ orderID, reason });
  }
}

function buildConsumer(
  reserve: IReserveStockHandler,
  release: IReleaseStockHandler,
  producer: IStockProducer,
): StockConsumer {
  return new StockConsumer('', 'test-group', reserve, release, producer);
}

function makeEnvelope(eventType: string, payload: unknown): string {
  return JSON.stringify({
    saga_id: 'test-saga',
    event_type: eventType,
    timestamp: '2026-05-12T00:00:00Z',
    payload,
  });
}

// --- tests ---

describe('StockConsumer.dispatch', () => {
  describe('order.placed', () => {
    it('calls reserveStockHandler with correct items', async () => {
      const reserve = new StubReserveHandler();
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), new StubProducer());

      await consumer.dispatch(
        'order.placed',
        makeEnvelope('order.placed', {
          order_id: 'ord-1',
          user_id: 'user-1',
          items: [{ product_id: 'prod-1', quantity: 2 }],
        }),
      );

      expect(reserve.received).toHaveLength(1);
      expect(reserve.received[0]).toMatchObject({
        orderID: 'ord-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
    });

    it('publishes stock.reserved when reservation succeeds', async () => {
      const reserve = new StubReserveHandler();
      reserve.result = { success: true };
      const producer = new StubProducer();
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), producer);

      await consumer.dispatch(
        'order.placed',
        makeEnvelope('order.placed', {
          order_id: 'ord-2',
          user_id: 'user-1',
          items: [{ product_id: 'prod-1', quantity: 1 }],
        }),
      );

      expect(producer.reservedCalls).toContain('ord-2');
      expect(producer.failedCalls).toHaveLength(0);
    });

    it('publishes stock.reservation.failed when reservation fails', async () => {
      const reserve = new StubReserveHandler();
      reserve.result = { success: false, reason: 'Insufficient stock' };
      const producer = new StubProducer();
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), producer);

      await consumer.dispatch(
        'order.placed',
        makeEnvelope('order.placed', {
          order_id: 'ord-3',
          user_id: 'user-1',
          items: [{ product_id: 'prod-1', quantity: 999 }],
        }),
      );

      expect(producer.failedCalls).toHaveLength(1);
      expect(producer.failedCalls[0]).toEqual({ orderID: 'ord-3', reason: 'Insufficient stock' });
      expect(producer.reservedCalls).toHaveLength(0);
    });

    it('re-throws when publishStockReserved fails after successful reserve', async () => {
      const reserve = new StubReserveHandler();
      reserve.result = { success: true };
      const producer = new StubProducer();
      producer.reservedError = new Error('broker unavailable');
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), producer);

      await expect(
        consumer.dispatch(
          'order.placed',
          makeEnvelope('order.placed', {
            order_id: 'ord-4',
            user_id: 'user-1',
            items: [{ product_id: 'prod-1', quantity: 1 }],
          }),
        ),
      ).rejects.toThrow('broker unavailable');
    });
  });

  describe('stock.release.requested', () => {
    it('calls releaseStockHandler with correct items', async () => {
      const release = new StubReleaseHandler();
      const consumer = buildConsumer(new StubReserveHandler(), release, new StubProducer());

      await consumer.dispatch(
        'stock.release.requested',
        makeEnvelope('stock.release.requested', {
          order_id: 'ord-5',
          items: [{ product_id: 'prod-2', quantity: 3 }],
        }),
      );

      expect(release.received).toHaveLength(1);
      expect(release.received[0]).toMatchObject({
        orderID: 'ord-5',
        items: [{ productId: 'prod-2', quantity: 3 }],
      });
    });
  });

  describe('unknown topic', () => {
    it('ignores unknown topics without error', async () => {
      const reserve = new StubReserveHandler();
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), new StubProducer());

      await expect(
        consumer.dispatch('payment.processed', makeEnvelope('payment.processed', { order_id: 'ord-6' })),
      ).resolves.toBeUndefined();

      expect(reserve.received).toHaveLength(0);
    });
  });

  describe('idempotency cache', () => {
    it('uses cached result on duplicate order.placed — handler called only once', async () => {
      const reserve = new StubReserveHandler();
      reserve.result = { success: true };
      const producer = new StubProducer();
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), producer);

      const envelope = makeEnvelope('order.placed', {
        order_id: 'ord-dup',
        user_id: 'user-1',
        items: [{ product_id: 'prod-1', quantity: 1 }],
      });

      await consumer.dispatch('order.placed', envelope);
      await consumer.dispatch('order.placed', envelope);

      expect(reserve.received).toHaveLength(1);
      expect(producer.reservedCalls).toHaveLength(2);
    });

    it('evicts oldest cache entry when the cache reaches 10 000 entries', async () => {
      const reserve = new StubReserveHandler();
      reserve.result = { success: true };
      const producer = new StubProducer();
      const consumer = buildConsumer(reserve, new StubReleaseHandler(), producer);

      // Fill cache to capacity (ord-fill-0 is the oldest entry).
      for (let i = 0; i < 10_000; i++) {
        await consumer.dispatch(
          'order.placed',
          makeEnvelope('order.placed', {
            order_id: `ord-fill-${i}`,
            user_id: 'user-1',
            items: [{ product_id: 'prod-1', quantity: 1 }],
          }),
        );
      }

      // Adding a new entry evicts ord-fill-0 (oldest).
      await consumer.dispatch(
        'order.placed',
        makeEnvelope('order.placed', {
          order_id: 'ord-trigger-eviction',
          user_id: 'user-1',
          items: [{ product_id: 'prod-1', quantity: 1 }],
        }),
      );

      const callsBefore = reserve.received.length;

      // ord-fill-0 is no longer in the cache — must call the handler again.
      await consumer.dispatch(
        'order.placed',
        makeEnvelope('order.placed', {
          order_id: 'ord-fill-0',
          user_id: 'user-1',
          items: [{ product_id: 'prod-1', quantity: 1 }],
        }),
      );

      expect(reserve.received.length).toBe(callsBefore + 1);
    });
  });
});
