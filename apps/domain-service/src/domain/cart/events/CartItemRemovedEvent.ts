import { DomainEvent } from '@teste-manuel/domain';

export class CartItemRemovedEvent extends DomainEvent {
  readonly eventName = 'CartItemRemoved';

  constructor(
    readonly cartId: string,
    readonly userId: string,
    readonly productId: string
  ) {
    super();
  }
}
