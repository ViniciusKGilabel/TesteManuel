import { IWooCommercePort } from '../ports/IWooCommercePort';
import { IStockReservationRepository } from '../../domain/stock/IStockReservationRepository';

export interface ReleaseStockCommand {
  orderID: string;
}

export interface IReleaseStockHandler {
  handle(command: ReleaseStockCommand): Promise<void>;
}

export class ReleaseStockHandler implements IReleaseStockHandler {
  constructor(
    private readonly wooCommerce: IWooCommercePort,
    private readonly reservations: IStockReservationRepository,
  ) {}

  async handle(command: ReleaseStockCommand): Promise<void> {
    const items = await this.reservations.getByOrderId(command.orderID);
    if (items.length === 0) return; // already released or never reserved

    // Restore WooCommerce stock before deleting the reservation record.
    for (const item of items) {
      await this.wooCommerce.updateStock(item.productId, item.quantity);
    }

    await this.reservations.release(command.orderID);
  }
}
