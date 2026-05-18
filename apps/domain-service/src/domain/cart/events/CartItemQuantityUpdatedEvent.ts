import { DomainEvent } from '@teste-manuel/domain';

export class CartItemQuantityUpdatedEvent extends DomainEvent {
  readonly eventName = 'CartItemQuantityUpdated';

  constructor(
    readonly cartId: string,
    readonly userId: string,
    readonly productId: string,
    readonly newQuantity: number
  ) {
    super();
  }
}
