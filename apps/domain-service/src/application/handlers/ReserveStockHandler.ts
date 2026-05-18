import { IWooCommercePort } from '../ports/IWooCommercePort';
import { IStockReservationRepository } from '../../domain/stock/IStockReservationRepository';
import { StockReservation } from '../../domain/stock/entities/StockReservation';

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

export interface IReserveStockHandler {
  handle(command: ReserveStockCommand): Promise<ReserveStockResult>;
}

export class ReserveStockHandler implements IReserveStockHandler {
  constructor(
    private readonly wooCommerce: IWooCommercePort,
    private readonly reservations: IStockReservationRepository,
  ) {}

  async handle(command: ReserveStockCommand): Promise<ReserveStockResult> {
    // Idempotency: if this order already has reservations, treat as success.
    const existing = await this.reservations.getByOrderId(command.orderID);
    if (existing.length > 0) {
      return { success: true };
    }

    // Check WooCommerce stock for all items before committing anything.
    for (const item of command.items) {
      const available = await this.wooCommerce.getStockQuantity(item.productId);
      if (available < item.quantity) {
        return {
          success: false,
          reason: `Insufficient stock for product ${item.productId}: available ${available}, requested ${item.quantity}`,
        };
      }
    }

    // Decrement WooCommerce stock item-by-item with rollback on any failure.
    const decremented: Array<{ productId: string; quantity: number }> = [];
    for (const item of command.items) {
      const ok = await this.wooCommerce.updateStock(item.productId, -item.quantity);
      if (!ok) {
        for (const d of decremented) {
          await this.wooCommerce.updateStock(d.productId, d.quantity);
        }
        return {
          success: false,
          reason: `Failed to decrement WooCommerce stock for product ${item.productId}`,
        };
      }
      decremented.push(item);
    }

    // Persist reservation entities for idempotency and release tracking.
    const entities = command.items.map((i) =>
      StockReservation.create(command.orderID, i.productId, i.quantity),
    );
    await this.reservations.reserve(entities);

    return { success: true };
  }
}
