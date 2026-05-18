import { AggregateRoot } from '@teste-manuel/domain';
import { generateId } from '@teste-manuel/shared-utils';
import { ProductId } from '../../product/value-objects/ProductId';
import { CartItemAddedEvent } from '../events/CartItemAddedEvent';
import { CartItemRemovedEvent } from '../events/CartItemRemovedEvent';
import { CartItemQuantityUpdatedEvent } from '../events/CartItemQuantityUpdatedEvent';

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
    if (!userId?.trim()) throw new Error('User ID is required');
    return new Cart({ id: generateId(), userId, items: [], updatedAt: new Date() });
  }

  static reconstitute(props: CartProps): Cart {
    for (const item of props.items) {
      ProductId.create(item.productId); // validates non-empty via VO
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }
      if (item.unitPrice < 0) throw new Error('Unit price cannot be negative');
    }
    return new Cart(props);
  }

  addItem(productId: string, quantity: number, unitPrice: number): void {
    const pid = ProductId.create(productId); // enforces non-empty via VO
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (unitPrice < 0) throw new Error('Unit price cannot be negative');

    const key = pid.value;
    const existing = this.items.get(key);
    if (existing) {
      this.items.set(key, { ...existing, quantity: existing.quantity + quantity });
    } else {
      this.items.set(key, { productId: key, quantity, unitPrice });
    }
    this.updatedAt = new Date();
    this.addDomainEvent(new CartItemAddedEvent(this._id, this.userId, key, quantity, unitPrice));
  }

  removeItem(productId: string): void {
    const key = ProductId.create(productId).value;
    if (!this.items.has(key)) throw new Error('Item not found in cart');
    this.items.delete(key);
    this.updatedAt = new Date();
    this.addDomainEvent(new CartItemRemovedEvent(this._id, this.userId, key));
  }

  updateQuantity(productId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    const key = ProductId.create(productId).value;
    const existing = this.items.get(key);
    if (!existing) throw new Error('Item not found in cart');
    this.items.set(key, { ...existing, quantity });
    this.updatedAt = new Date();
    this.addDomainEvent(new CartItemQuantityUpdatedEvent(this._id, this.userId, key, quantity));
  }

  clear(): void {
    this.items.clear();
    this.updatedAt = new Date();
  }

  get cartId(): string { return this._id; }
  get cartUserId(): string { return this.userId; }
  get cartItems(): CartLineItem[] { return Array.from(this.items.values()); }
  get cartUpdatedAt(): Date { return this.updatedAt; }

  get total(): number {
    return Math.round(
      Array.from(this.items.values()).reduce(
        (sum, item) => sum + item.quantity * item.unitPrice, 0,
      ) * 100,
    ) / 100;
  }

  get itemCount(): number {
    return Array.from(this.items.values()).reduce((sum, item) => sum + item.quantity, 0);
  }

  equals(other: Cart): boolean {
    return this._id === other._id;
  }
}
