import { IRepository } from '@teste-manuel/domain';
import { Order } from './entities/Order';

export interface IOrderRepository extends IRepository<Order> {
  findByUserId(userId: string): Promise<Order[]>;
}
