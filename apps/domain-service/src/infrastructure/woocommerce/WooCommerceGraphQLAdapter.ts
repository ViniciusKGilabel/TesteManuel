import { IWooCommercePort, WooProductData } from '../../application/ports/IWooCommercePort';

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes {
        databaseId
        name
        description
        ... on SimpleProduct {
          price
          stockStatus
          stockQuantity
        }
      }
    }
  }
`;

const PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    product(id: $id, idType: DATABASE_ID) {
      databaseId
      name
      description
      ... on SimpleProduct {
        price
        stockStatus
        stockQuantity
      }
    }
  }
`;

type WooNode = {
  databaseId: number;
  name: string;
  description: string;
  price?: string;
  stockStatus?: string;
  stockQuantity?: number;
};

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function toProduct(node: WooNode): WooProductData {
  return {
    id: String(node.databaseId),
    name: node.name,
    description: stripHtml(node.description ?? ''),
    price: parsePrice(node.price),
    currency: 'BRL',
    stock: node.stockStatus === 'IN_STOCK' ? (node.stockQuantity ?? 1) : 0,
  };
}

export class WooCommerceGraphQLAdapter implements IWooCommercePort {
  private readonly stockUpdateUrl: string;
  private readonly internalSecret: string;

  constructor(private readonly wooUrl: string) {
    this.stockUpdateUrl =
      process.env.WC_STOCK_UPDATE_URL ?? wooUrl.replace('/graphql', '/wp-json/tm/v1/stock/update');
    this.internalSecret =
      process.env.WC_INTERNAL_SECRET ?? 'dev-internal-secret-32chars!!!!!';
  }

  private async gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
    try {
      const res = await fetch(this.wooUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json() as { data?: T };
      return json?.data ?? null;
    } catch {
      return null;
    }
  }

  async getStockQuantity(productId: string): Promise<number> {
    const data = await this.gql<{ product?: { stockStatus?: string; stockQuantity?: number } }>(
      PRODUCT_QUERY,
      { id: productId },
    );
    const p = data?.product;
    if (!p) return 0;
    return p.stockStatus === 'IN_STOCK' ? (p.stockQuantity ?? 1) : 0;
  }

  async getProducts(limit = 50): Promise<WooProductData[]> {
    const data = await this.gql<{ products?: { nodes: WooNode[] } }>(
      PRODUCTS_QUERY,
      { first: limit },
    );
    return (data?.products?.nodes ?? []).map(toProduct);
  }

  async getProduct(productId: string): Promise<WooProductData | null> {
    const data = await this.gql<{ product?: WooNode | null }>(
      PRODUCT_QUERY,
      { id: productId },
    );
    return data?.product ? toProduct(data.product) : null;
  }

  async updateStock(productId: string, delta: number): Promise<boolean> {
    try {
      const res = await fetch(this.stockUpdateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': this.internalSecret,
        },
        body: JSON.stringify({ product_id: productId, delta }),
      });
      if (res.status === 409) return false; // insufficient stock
      return res.ok;
    } catch {
      return false;
    }
  }
}
