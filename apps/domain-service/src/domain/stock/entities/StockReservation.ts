import { Entity } from '@teste-manuel/domain';
import { ProductId } from '../../product/value-objects/ProductId';

export class StockReservation extends Entity<string> {
  private constructor(
    private readonly _orderId: string,
    private readonly _productId: ProductId,
    private readonly _quantity: number,
    createdAt?: Date,
  ) {
    super(`${_orderId}::${_productId.value}`, createdAt);
  }

  static create(orderId: string, productId: string, quantity: number): StockReservation {
    if (!orderId?.trim()) throw new Error('orderId is required');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('quantity must be a positive integer');
    }
    return new StockReservation(orderId, ProductId.create(productId), quantity);
  }

  static reconstitute(
    orderId: string,
    productId: string,
    quantity: number,
    createdAt: Date,
  ): StockReservation {
    return new StockReservation(orderId, ProductId.create(productId), quantity, createdAt);
  }

  get orderId(): string { return this._orderId; }
  get productId(): string { return this._productId.value; }
  get quantity(): number { return this._quantity; }

  equals(other: Entity<string>): boolean {
    return this._id === other.id;
  }
}
