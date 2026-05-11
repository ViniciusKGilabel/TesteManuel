export class CreateProductCommand {
  constructor(
    readonly name: string,
    readonly description: string,
    readonly price: number,
    readonly stock: number,
    readonly currency: string = 'BRL'
  ) {}
}
