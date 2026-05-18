import { IWooCommercePort } from '../../application/ports/IWooCommercePort';

export function createResolvers(woo: IWooCommercePort) {
  return {
    Query: {
      products: () => woo.getProducts(),
      product: (_: unknown, { id }: { id: string }) => woo.getProduct(id),
      _health: () => true,
    },
    Product: {
      __resolveReference: ({ id }: { id: string }) => woo.getProduct(id),
    },
  };
}
