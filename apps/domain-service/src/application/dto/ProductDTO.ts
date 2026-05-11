import { Product } from '../../domain/product/entities/Product';

export class ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  createdAt: Date;

  constructor(product: Product) {
    this.id = product.productId;
    this.name = product.productName;
    this.description = product.productDescription;
    this.price = product.productPrice.amount;
    this.currency = product.productPrice.currency;
    this.stock = product.productStock.quantity;
    this.createdAt = product.createdAt;
  }
}
