export interface StockReservationItem {
  orderId: string;
  productId: string;
  quantity: number;
}

export interface IStockReservationRepository {
  getTotalReserved(productId: string): Promise<number>;
  reserve(items: StockReservationItem[]): Promise<void>;
  release(orderId: string): Promise<void>;
}
