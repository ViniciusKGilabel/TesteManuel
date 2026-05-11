import { ValueObject } from '@teste-manuel/domain';
import { hashPassword, verifyPassword } from '@teste-manuel/shared-utils';

export interface PasswordProps {
  hashedValue: string;
}

export class Password extends ValueObject<PasswordProps> {
  private static readonly MIN_LENGTH = 8;

  constructor(hashedValue: string) {
    super({ hashedValue });
  }

  static create(plainPassword: string): Password {
    if (plainPassword.length < Password.MIN_LENGTH) {
      throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters`);
    }
    const hashedValue = hashPassword(plainPassword);
    return new Password(hashedValue);
  }

  verify(plainPassword: string): boolean {
    return verifyPassword(plainPassword, this.props.hashedValue);
  }

  get hashedValue(): string {
    return this.props.hashedValue;
  }

  equals(other: Password): boolean {
    return this.props.hashedValue === other.props.hashedValue;
  }
}
