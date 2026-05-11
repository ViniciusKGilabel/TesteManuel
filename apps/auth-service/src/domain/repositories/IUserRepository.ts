import { IRepository } from '@teste-manuel/domain';
import { User } from '../entities/User';
import { Email } from '../value-objects/Email';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: Email): Promise<User | null>;
  emailExists(email: Email): Promise<boolean>;
}
