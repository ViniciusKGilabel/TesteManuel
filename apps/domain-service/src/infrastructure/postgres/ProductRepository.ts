import { Pool } from 'pg';
import { IProductRepository } from '../../domain/product/IProductRepository';
import { Product } from '../../domain/product/entities/Product';
import { Price } from '../../domain/product/value-objects/Price';
import { Stock } from '../../domain/product/value-objects/Stock';

interface ProductRow {
  id: string;
  name: string;
  description: string;
  price_amount: string; // NUMERIC comes as string from pg
  currency: string;
  stock_quantity: number;
  created_at: Date;
}

export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        description    TEXT NOT NULL DEFAULT '',
        price_amount   NUMERIC(12, 2) NOT NULL,
        currency       TEXT NOT NULL DEFAULT 'BRL',
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS products_name_idx ON products (name);
    `);
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>('SELECT COUNT(*) FROM products');
    return parseInt(rows[0].count, 10);
  }

  async save(product: Product): Promise<void> {
    await this.pool.query(
      `INSERT INTO products (id, name, description, price_amount, currency, stock_quantity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name           = EXCLUDED.name,
         description    = EXCLUDED.description,
         price_amount   = EXCLUDED.price_amount,
         currency       = EXCLUDED.currency,
         stock_quantity = EXCLUDED.stock_quantity`,
      [
        product.productId,
        product.productName,
        product.productDescription,
        product.productPrice.amount,
        product.productPrice.currency,
        product.productStock.quantity,
        product.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<Product | null> {
    const { rows } = await this.pool.query<ProductRow>('SELECT * FROM products WHERE id = $1', [id]);
    return rows.length ? this.toProduct(rows[0]) : null;
  }

  async findAll(): Promise<Product[]> {
    const { rows } = await this.pool.query<ProductRow>('SELECT * FROM products ORDER BY created_at');
    return rows.map((r) => this.toProduct(r));
  }

  async findByName(name: string): Promise<Product | null> {
    const { rows } = await this.pool.query<ProductRow>(
      'SELECT * FROM products WHERE name = $1 LIMIT 1',
      [name],
    );
    return rows.length ? this.toProduct(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM products WHERE id = $1', [id]);
  }

  private toProduct(row: ProductRow): Product {
    return Product.reconstitute({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Price.create(parseFloat(row.price_amount), row.currency),
      stock: Stock.create(row.stock_quantity),
      createdAt: row.created_at,
    });
  }
}
