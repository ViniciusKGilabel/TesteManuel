import { IRepository } from '@teste-manuel/domain';
import { Cart } from './entities/Cart';

export interface ICartRepository extends IRepository<Cart> {
  findByUserId(userId: string): Promise<Cart | null>;
}
