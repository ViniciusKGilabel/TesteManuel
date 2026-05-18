export interface WooProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
}

export interface IWooCommercePort {
  getStockQuantity(productId: string): Promise<number>;
  getProducts(limit?: number): Promise<WooProductData[]>;
  getProduct(productId: string): Promise<WooProductData | null>;
  /** delta < 0 decrements stock, delta > 0 restores it. Returns false if insufficient stock. */
  updateStock(productId: string, delta: number): Promise<boolean>;
}
