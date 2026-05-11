import { DomainEvent } from '@teste-manuel/domain';

export class ProductCreatedEvent extends DomainEvent {
  readonly eventName = 'ProductCreated';

  constructor(
    readonly productId: string,
    readonly name: string,
    readonly price: number,
    readonly stock: number
  ) {
    super();
  }
}
