import { IProductRepository } from '../../domain/product/IProductRepository';
import { ProductDTO } from '../../application/dto/ProductDTO';

export function createResolvers(repo: IProductRepository) {
  return {
    Query: {
      products: () => repo.findAll().then((ps) => ps.map((p) => new ProductDTO(p))),
      product: (_: unknown, { id }: { id: string }) =>
        repo.findById(id).then((p) => (p ? new ProductDTO(p) : null)),
    },
    Product: {
      __resolveReference: ({ id }: { id: string }) =>
        repo.findById(id).then((p) => (p ? new ProductDTO(p) : null)),
    },
  };
}
