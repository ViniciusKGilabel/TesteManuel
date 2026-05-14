import { IProductRepository } from '../../domain/product/IProductRepository';

export interface ReserveStockItem {
  productId: string;
  quantity: number;
}

export interface ReserveStockCommand {
  orderID: string;
  items: ReserveStockItem[];
}

export type ReserveStockResult =
  | { success: true }
  | { success: false; reason: string };

export class ReserveStockHandler {
  constructor(private readonly productRepository: IProductRepository) {}

  async handle(command: ReserveStockCommand): Promise<ReserveStockResult> {
    const committed: ReserveStockItem[] = [];

    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        await this.rollback(committed);
        return { success: false, reason: `Product ${item.productId} not found` };
      }
      try {
        product.reserveStock(item.quantity);
        await this.productRepository.save(product);
        committed.push(item);
      } catch (err) {
        await this.rollback(committed);
        return { success: false, reason: (err as Error).message };
      }
    }
    return { success: true };
  }

  private async rollback(committed: ReserveStockItem[]): Promise<void> {
    for (const item of committed) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.replenishStock(item.quantity);
        await this.productRepository.save(product);
      }
    }
  }
}
