import { Pool, PoolClient } from 'pg';
import { IStockReservationRepository, StockReservation } from '../../domain/stock/IStockReservationRepository';

export class PostgresStockReservationRepository implements IStockReservationRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        order_id    TEXT NOT NULL,
        product_id  TEXT NOT NULL,
        quantity    INT  NOT NULL CHECK (quantity > 0),
        reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (order_id, product_id)
      );
    `);
  }

  async getByOrderId(orderId: string): Promise<StockReservation[]> {
    const { rows } = await this.pool.query<{
      order_id: string;
      product_id: string;
      quantity: number;
      reserved_at: Date;
    }>(
      `SELECT order_id, product_id, quantity, reserved_at
         FROM stock_reservations
        WHERE order_id = $1`,
      [orderId],
    );
    return rows.map((r) =>
      StockReservation.reconstitute(r.order_id, r.product_id, r.quantity, r.reserved_at),
    );
  }

  async reserve(reservations: StockReservation[]): Promise<void> {
    if (reservations.length === 0) return;
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of reservations) {
        await client.query(
          `INSERT INTO stock_reservations (order_id, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (order_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
          [r.orderId, r.productId, r.quantity],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async release(orderId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM stock_reservations WHERE order_id = $1',
      [orderId],
    );
  }
}
