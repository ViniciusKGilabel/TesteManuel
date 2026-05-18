import { ValueObject } from '@teste-manuel/domain';

interface ProductIdProps {
  value: string;
}

export class ProductId extends ValueObject<ProductIdProps> {
  static create(value: string): ProductId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error('Product ID is required');
    return new ProductId({ value: trimmed });
  }

  get value(): string {
    return this.props.value;
  }

  equals(other: ValueObject<ProductIdProps>): boolean {
    return other instanceof ProductId && this.props.value === other.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
