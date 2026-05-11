import { ValueObject } from '@teste-manuel/domain';

export interface StockProps {
  quantity: number;
}

export class Stock extends ValueObject<StockProps> {
  constructor(quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Stock quantity must be a non-negative integer');
    }
    super({ quantity });
  }

  static create(quantity: number): Stock {
    return new Stock(quantity);
  }

  get quantity(): number {
    return this.props.quantity;
  }

  isAvailable(): boolean {
    return this.props.quantity > 0;
  }

  reserve(amount: number): Stock {
    if (amount <= 0) {
      throw new Error('Reserve amount must be positive');
    }
    if (amount > this.props.quantity) {
      throw new Error('Insufficient stock');
    }
    return new Stock(this.props.quantity - amount);
  }

  replenish(amount: number): Stock {
    if (amount <= 0) {
      throw new Error('Replenish amount must be positive');
    }
    return new Stock(this.props.quantity + amount);
  }

  equals(other: Stock): boolean {
    return this.props.quantity === other.props.quantity;
  }
}
