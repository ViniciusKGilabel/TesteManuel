export class GetProductsQuery {
  constructor(
    readonly limit?: number,
    readonly offset?: number
  ) {}
}
