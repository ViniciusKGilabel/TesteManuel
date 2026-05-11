import { DomainEvent } from '@teste-manuel/domain';

export class OrderPlacedEvent extends DomainEvent {
  readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly userId: string,
    readonly total: number,
    readonly itemCount: number
  ) {
    super();
  }
}
