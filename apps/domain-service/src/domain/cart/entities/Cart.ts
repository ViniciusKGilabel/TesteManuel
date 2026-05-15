import { AggregateRoot } from '@teste-manuel/domain';
import { generateId } from '@teste-manuel/shared-utils';

export interface CartLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CartProps {
  id: string;
  userId: string;
  items: CartLineItem[];
  updatedAt: Date;
}

export class Cart extends AggregateRoot<string> {
  private userId: string;
  private items: Map<string, CartLineItem>;
  private updatedAt: Date;

  private constructor(props: CartProps) {
    super(props.id, new Date());
    this.userId = props.userId;
    this.items = new Map(props.items.map((item) => [item.productId, { ...item }]));
    this.updatedAt = props.updatedAt;
  }

  static create(userId: string): Cart {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return new Cart({
      id: generateId(),
      userId,
      items: [],
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: CartProps): Cart {
    for (const item of props.items) {
      if (!item.productId) throw new Error('Product ID is required');
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }
      if (item.unitPrice < 0) throw new Error('Unit price cannot be negative');
    }
    return new Cart(props);
  }

  addItem(productId: string, quantity: number, unitPrice: number): void {
    if (!productId) throw new Error('Product ID is required');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (unitPrice < 0) throw new Error('Unit price cannot be negative');

    const existing = this.items.get(productId);
    if (existing) {
      this.items.set(productId, { ...existing, quantity: existing.quantity + quantity });
    } else {
      this.items.set(productId, { productId, quantity, unitPrice });
    }
    this.updatedAt = new Date();
  }

  removeItem(productId: string): void {
    if (!this.items.has(productId)) {
      throw new Error('Item not found in cart');
    }
    this.items.delete(productId);
    this.updatedAt = new Date();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (!this.items.has(productId)) {
      throw new Error('Item not found in cart');
    }
    const existing = this.items.get(productId);
    if (!existing) throw new Error('Item not found in cart');
    this.items.set(productId, { ...existing, quantity });
    this.updatedAt = new Date();
  }

  clear(): void {
    this.items.clear();
    this.updatedAt = new Date();
  }

  get cartId(): string {
    return this._id;
  }

  get cartUserId(): string {
    return this.userId;
  }

  get cartItems(): CartLineItem[] {
    return Array.from(this.items.values());
  }

  get cartUpdatedAt(): Date {
    return this.updatedAt;
  }

  get total(): number {
    return Math.round(
      Array.from(this.items.values()).reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      ) * 100
    ) / 100;
  }

  get itemCount(): number {
    return Array.from(this.items.values()).reduce((sum, item) => sum + item.quantity, 0);
  }

  equals(other: Cart): boolean {
    return this._id === other._id;
  }
}
