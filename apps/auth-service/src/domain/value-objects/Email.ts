import { ValueObject } from '@teste-manuel/domain';
import { isValidEmail } from '@teste-manuel/shared-utils';

export interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  constructor(value: string) {
    if (!isValidEmail(value)) {
      throw new Error('Invalid email format');
    }
    super({ value });
  }

  static create(value: string): Email {
    return new Email(value);
  }

  get value(): string {
    return this.props.value;
  }

  equals(other: Email): boolean {
    return this.props.value === other.props.value;
  }
}
