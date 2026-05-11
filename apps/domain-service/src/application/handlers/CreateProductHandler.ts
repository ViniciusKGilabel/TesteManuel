import { CreateProductCommand } from '../commands/CreateProductCommand';
import { Price } from '../../domain/product/value-objects/Price';
import { Stock } from '../../domain/product/value-objects/Stock';
import { Product } from '../../domain/product/entities/Product';
import { IProductRepository } from '../../domain/product/IProductRepository';
import { ProductDTO } from '../dto/ProductDTO';

export class CreateProductHandler {
  constructor(private productRepository: IProductRepository) {}

  async handle(command: CreateProductCommand): Promise<ProductDTO> {
    const price = Price.create(command.price, command.currency);
    const stock = Stock.create(command.stock);
    const product = Product.create(command.name, command.description, price, stock);

    await this.productRepository.save(product);

    return new ProductDTO(product);
  }
}
