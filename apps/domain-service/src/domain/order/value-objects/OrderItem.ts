import { ValueObject } from '@teste-manuel/domain';

export interface OrderItemProps {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export class OrderItem extends ValueObject<OrderItemProps> {
  constructor(productId: string, quantity: number, unitPrice: number) {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (unitPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }
    super({ productId, quantity, unitPrice });
  }

  static create(productId: string, quantity: number, unitPrice: number): OrderItem {
    return new OrderItem(productId, quantity, unitPrice);
  }

  get productId(): string {
    return this.props.productId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  get subtotal(): number {
    return Math.round(this.props.quantity * this.props.unitPrice * 100) / 100;
  }

  equals(other: OrderItem): boolean {
    return (
      this.props.productId === other.props.productId &&
      this.props.quantity === other.props.quantity &&
      this.props.unitPrice === other.props.unitPrice
    );
  }
}
