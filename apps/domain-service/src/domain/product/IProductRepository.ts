import { IRepository } from '@teste-manuel/domain';
import { Product } from './entities/Product';

export interface IProductRepository extends IRepository<Product> {
  findAll(): Promise<Product[]>;
  findByName(name: string): Promise<Product | null>;
}
