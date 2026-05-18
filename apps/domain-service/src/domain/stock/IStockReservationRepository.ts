export interface StockReservationItem {
  orderId: string;
  productId: string;
  quantity: number;
}

export interface IStockReservationRepository {
  getByOrderId(orderId: string): Promise<StockReservationItem[]>;
  reserve(items: StockReservationItem[]): Promise<void>;
  release(orderId: string): Promise<void>;
}
