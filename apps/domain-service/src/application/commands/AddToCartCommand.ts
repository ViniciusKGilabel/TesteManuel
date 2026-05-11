export class AddToCartCommand {
  constructor(
    readonly userId: string,
    readonly productId: string,
    readonly quantity: number,
    readonly unitPrice: number
  ) {}
}
