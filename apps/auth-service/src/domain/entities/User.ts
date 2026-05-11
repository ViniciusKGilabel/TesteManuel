import { AggregateRoot } from '@teste-manuel/domain';
import { UserId } from '../value-objects/UserId';
import { Email } from '../value-objects/Email';
import { Password } from '../value-objects/Password';
import { UserCreatedEvent } from '../events/UserCreatedEvent';

export interface UserProps {
  id: UserId;
  email: Email;
  password: Password;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}

export class User extends AggregateRoot<UserId> {
  private email: Email;
  private password: Password;
  private name: string;
  private role: 'USER' | 'ADMIN';

  private constructor(props: UserProps) {
    super(props.id, props.createdAt);
    this.email = props.email;
    this.password = props.password;
    this.name = props.name;
    this.role = props.role;
  }

  static create(email: Email, password: Password, name: string): User {
    const userId = UserId.generate();
    const user = new User({
      id: userId,
      email,
      password,
      name,
      role: 'USER',
      createdAt: new Date(),
    });

    user.addDomainEvent(
      new UserCreatedEvent(userId.value, email.value, name)
    );

    return user;
  }

  verifyPassword(plainPassword: string): boolean {
    return this.password.verify(plainPassword);
  }

  changePassword(currentPassword: string, newPassword: Password): void {
    if (!this.verifyPassword(currentPassword)) {
      throw new Error('Current password is incorrect');
    }
    this.password = newPassword;
  }

  get userId(): UserId {
    return this._id;
  }

  get userEmail(): Email {
    return this.email;
  }

  get userName(): string {
    return this.name;
  }

  get userRole(): 'USER' | 'ADMIN' {
    return this.role;
  }

  equals(other: User): boolean {
    return this.userId.equals(other.userId);
  }
}
