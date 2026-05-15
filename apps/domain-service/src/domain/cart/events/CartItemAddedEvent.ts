import { DomainEvent } from '@teste-manuel/domain';

export class CartItemAddedEvent extends DomainEvent {
  readonly eventName = 'CartItemAdded';

  constructor(
    readonly cartId: string,
    readonly userId: string,
    readonly productId: string,
    readonly quantity: number,
    readonly unitPrice: number
  ) {
    super();
  }
}
