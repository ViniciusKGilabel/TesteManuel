import { IProductRepository } from '../../domain/product/IProductRepository';

export interface ReleaseStockItem {
  productId: string;
  quantity: number;
}

export interface ReleaseStockCommand {
  orderID: string;
  items: ReleaseStockItem[];
}

export interface IReleaseStockHandler {
  handle(command: ReleaseStockCommand): Promise<void>;
}

export class ReleaseStockHandler implements IReleaseStockHandler {
  constructor(private readonly productRepository: IProductRepository) {}

  async handle(command: ReleaseStockCommand): Promise<void> {
    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        console.warn(`[release-stock] product ${item.productId} not found, skipping`);
        continue;
      }
      product.replenishStock(item.quantity);
      await this.productRepository.save(product);
    }
  }
}
