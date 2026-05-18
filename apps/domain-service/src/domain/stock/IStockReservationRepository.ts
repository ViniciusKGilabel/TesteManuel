import { StockReservation } from './entities/StockReservation';

export type { StockReservation };

export interface IStockReservationRepository {
  getByOrderId(orderId: string): Promise<StockReservation[]>;
  reserve(reservations: StockReservation[]): Promise<void>;
  release(orderId: string): Promise<void>;
}
