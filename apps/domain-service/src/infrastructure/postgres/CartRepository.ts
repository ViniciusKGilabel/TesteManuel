import { Pool } from 'pg';
import { Cart, CartLineItem } from '../../domain/cart/entities/Cart';
import { ICartRepository } from '../../domain/cart/ICartRepository';

export class PostgresCartRepository implements ICartRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL UNIQUE,
        items      JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async save(cart: Cart): Promise<void> {
    await this.pool.query(
      `INSERT INTO carts (id, user_id, items, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET items      = EXCLUDED.items,
             updated_at = EXCLUDED.updated_at`,
      [cart.cartId, cart.cartUserId, JSON.stringify(cart.cartItems), cart.cartUpdatedAt],
    );
  }

  async findById(id: string): Promise<Cart | null> {
    const { rows } = await this.pool.query<{
      id: string; user_id: string; items: CartLineItem[]; updated_at: Date;
    }>(
      'SELECT id, user_id, items, updated_at FROM carts WHERE id = $1',
      [id],
    );
    if (!rows[0]) return null;
    return Cart.reconstitute({
      id: rows[0].id,
      userId: rows[0].user_id,
      items: rows[0].items,
      updatedAt: rows[0].updated_at,
    });
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const { rows } = await this.pool.query<{
      id: string; user_id: string; items: CartLineItem[]; updated_at: Date;
    }>(
      'SELECT id, user_id, items, updated_at FROM carts WHERE user_id = $1',
      [userId],
    );
    if (!rows[0]) return null;
    return Cart.reconstitute({
      id: rows[0].id,
      userId: rows[0].user_id,
      items: rows[0].items,
      updatedAt: rows[0].updated_at,
    });
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM carts WHERE id = $1', [id]);
  }
}
