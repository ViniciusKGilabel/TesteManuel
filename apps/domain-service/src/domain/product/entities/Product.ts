import { AggregateRoot } from '@teste-manuel/domain';
import { generateId } from '@teste-manuel/shared-utils';
import { Price } from '../value-objects/Price';
import { Stock } from '../value-objects/Stock';
import { ProductCreatedEvent } from '../events/ProductCreatedEvent';

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: Price;
  stock: Stock;
  createdAt: Date;
}

export class Product extends AggregateRoot<string> {
  private name: string;
  private description: string;
  private price: Price;
  private stock: Stock;

  private constructor(props: ProductProps) {
    super(props.id, props.createdAt);
    this.name = props.name;
    this.description = props.description;
    this.price = props.price;
    this.stock = props.stock;
  }

  static create(name: string, description: string, price: Price, stock: Stock): Product {
    if (!name || name.trim().length === 0) {
      throw new Error('Product name cannot be empty');
    }

    const productId = generateId();
    const product = new Product({
      id: productId,
      name: name.trim(),
      description,
      price,
      stock,
      createdAt: new Date(),
    });

    product.addDomainEvent(
      new ProductCreatedEvent(productId, name, price.amount, stock.quantity)
    );

    return product;
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  updatePrice(newPrice: Price): void {
    this.price = newPrice;
  }

  reserveStock(quantity: number): void {
    this.stock = this.stock.reserve(quantity);
  }

  replenishStock(quantity: number): void {
    this.stock = this.stock.replenish(quantity);
  }

  get productId(): string {
    return this._id;
  }

  get productName(): string {
    return this.name;
  }

  get productDescription(): string {
    return this.description;
  }

  get productPrice(): Price {
    return this.price;
  }

  get productStock(): Stock {
    return this.stock;
  }

  equals(other: Product): boolean {
    return this._id === other._id;
  }
}
