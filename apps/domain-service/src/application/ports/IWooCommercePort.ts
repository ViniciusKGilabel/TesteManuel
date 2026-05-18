export interface IWooCommercePort {
  getStockQuantity(productId: string): Promise<number>;
}
