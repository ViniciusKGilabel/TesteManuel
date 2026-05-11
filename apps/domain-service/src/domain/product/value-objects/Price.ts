import { ValueObject } from '@teste-manuel/domain';

export interface PriceProps {
  amount: number;
  currency: string;
}

export class Price extends ValueObject<PriceProps> {
  constructor(amount: number, currency: string = 'BRL') {
    if (amount < 0) {
      throw new Error('Price amount cannot be negative');
    }
    super({ amount, currency });
  }

  static create(amount: number, currency: string = 'BRL'): Price {
    return new Price(amount, currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Price): Price {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add prices with different currencies');
    }
    return new Price(this.props.amount + other.props.amount, this.props.currency);
  }

  multiply(factor: number): Price {
    return new Price(Math.round(this.props.amount * factor * 100) / 100, this.props.currency);
  }

  equals(other: Price): boolean {
    return this.props.amount === other.props.amount && this.props.currency === other.props.currency;
  }
}
