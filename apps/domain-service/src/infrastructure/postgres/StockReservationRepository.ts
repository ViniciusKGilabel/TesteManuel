import { Pool, PoolClient } from 'pg';
import { IStockReservationRepository, StockReservationItem } from '../../domain/stock/IStockReservationRepository';

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

  async getByOrderId(orderId: string): Promise<StockReservationItem[]> {
    const { rows } = await this.pool.query<StockReservationItem>(
      `SELECT order_id AS "orderId", product_id AS "productId", quantity
         FROM stock_reservations
        WHERE order_id = $1`,
      [orderId],
    );
    return rows;
  }

  async reserve(items: StockReservationItem[]): Promise<void> {
    if (items.length === 0) return;
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await client.query(
          `INSERT INTO stock_reservations (order_id, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (order_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
          [item.orderId, item.productId, item.quantity],
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
