import { DomainEvent } from '@teste-manuel/domain';

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = 'UserCreated';

  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string
  ) {
    super();
  }
}
