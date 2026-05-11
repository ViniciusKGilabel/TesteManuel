import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';

export class MockUserRepository implements IUserRepository {
  private store: InMemoryRepository<User> = new InMemoryRepository();

  async save(aggregate: User): Promise<void> {
    await this.store.save(aggregate.userId.value, aggregate);
  }

  async findById(id: any): Promise<User | null> {
    return this.store.findById(id);
  }

  async delete(id: any): Promise<void> {
    return this.store.delete(id);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const users = await this.store.findAll();
    return users.find(user => user.userEmail.equals(email)) || null;
  }

  async emailExists(email: Email): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async findAll(): Promise<User[]> {
    return this.store.findAll();
  }

  clear(): void {
    this.store.clear();
  }
}
