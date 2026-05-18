const WOO_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:4000/graphql';

const WOO_PRODUCTS_QUERY = `{
  products {
    id
    name
    description
    price
    currency
    stock
  }
}`;

export interface WooProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

export async function fetchWooProducts(): Promise<WooProduct[]> {
  try {
    const res = await fetch(WOO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: WOO_PRODUCTS_QUERY }),
    });
    const json = await res.json();
    return (json?.data?.products ?? []) as WooProduct[];
  } catch {
    return [];
  }
}
