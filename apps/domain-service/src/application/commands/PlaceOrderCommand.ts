export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export class PlaceOrderCommand {
  constructor(
    readonly userId: string,
    readonly items: OrderItemInput[]
  ) {}
}
