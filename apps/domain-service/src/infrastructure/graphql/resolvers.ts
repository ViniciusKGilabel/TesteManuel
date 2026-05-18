import { IWooCommercePort } from '../../application/ports/IWooCommercePort';
import { AddToCartHandler } from '../../application/handlers/AddToCartHandler';
import { AddToCartCommand } from '../../application/commands/AddToCartCommand';

interface AddToCartInput {
  userId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function createResolvers(woo: IWooCommercePort, addToCart: AddToCartHandler) {
  return {
    Query: {
      products: () => woo.getProducts(),
      product: (_: unknown, { id }: { id: string }) => woo.getProduct(id),
      _health: () => true,
    },
    Mutation: {
      addToCart: async (_: unknown, { input }: { input: AddToCartInput }) => {
        const cart = await addToCart.handle(
          new AddToCartCommand(input.userId, input.productId, input.quantity, input.unitPrice),
        );
        return {
          id: cart.cartId,
          userId: cart.cartUserId,
          items: cart.cartItems,
          total: cart.total,
        };
      },
    },
    Product: {
      __resolveReference: ({ id }: { id: string }) => woo.getProduct(id),
    },
  };
}
