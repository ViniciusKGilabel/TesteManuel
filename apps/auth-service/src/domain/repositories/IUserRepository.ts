import { IRepository } from '@teste-manuel/domain';
import { User } from '../entities/User';
import { Email } from '../value-objects/Email';
import { UserId } from '../value-objects/UserId';

export interface IUserRepository extends IRepository<User, UserId> {
  findByEmail(email: Email): Promise<User | null>;
  emailExists(email: Email): Promise<boolean>;
}
