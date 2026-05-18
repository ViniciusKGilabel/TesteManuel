import { DomainEvent } from '@teste-manuel/domain';

export class CartClearedEvent extends DomainEvent {
  readonly eventName = 'CartCleared';

  constructor(
    readonly cartId: string,
    readonly userId: string,
  ) {
    super();
  }
}
