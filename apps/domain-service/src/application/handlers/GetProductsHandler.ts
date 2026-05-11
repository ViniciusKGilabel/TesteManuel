import { GetProductsQuery } from '../queries/GetProductsQuery';
import { IProductRepository } from '../../domain/product/IProductRepository';
import { ProductDTO } from '../dto/ProductDTO';

export class GetProductsHandler {
  constructor(private productRepository: IProductRepository) {}

  async handle(_query: GetProductsQuery): Promise<ProductDTO[]> {
    const products = await this.productRepository.findAll();
    return products.map((product) => new ProductDTO(product));
  }
}
