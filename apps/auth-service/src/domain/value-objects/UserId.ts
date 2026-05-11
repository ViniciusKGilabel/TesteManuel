import { ValueObject } from '@teste-manuel/domain';
import { generateId } from '@teste-manuel/shared-utils';

export interface UserIdProps {
  value: string;
}

export class UserId extends ValueObject<UserIdProps> {
  constructor(value: string) {
    super({ value });
  }

  static generate(): UserId {
    return new UserId(generateId());
  }

  static create(value: string): UserId {
    return new UserId(value);
  }

  get value(): string {
    return this.props.value;
  }

  equals(other: UserId): boolean {
    return this.props.value === other.props.value;
  }
}
