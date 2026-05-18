import { IWooCommercePort } from '../../application/ports/IWooCommercePort';

const STOCK_QUERY = `
  query GetProductStock($id: ID!) {
    product(id: $id, idType: DATABASE_ID) {
      ... on SimpleProduct {
        stockQuantity
        stockStatus
      }
    }
  }
`;

export class WooCommerceGraphQLAdapter implements IWooCommercePort {
  constructor(private readonly wooUrl: string) {}

  async getStockQuantity(productId: string): Promise<number> {
    try {
      const res = await fetch(this.wooUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: STOCK_QUERY, variables: { id: productId } }),
      });
      const json = await res.json() as { data?: { product?: { stockStatus?: string; stockQuantity?: number } } };
      const product = json?.data?.product;
      if (!product) return 0;
      return product.stockStatus === 'IN_STOCK' ? (product.stockQuantity ?? 1) : 0;
    } catch {
      return 0;
    }
  }
}
