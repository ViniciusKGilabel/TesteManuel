import { AddToCartCommand } from '../commands/AddToCartCommand';
import { Cart } from '../../domain/cart/entities/Cart';
import { ICartRepository } from '../../domain/cart/ICartRepository';
import { IWooCommercePort } from '../ports/IWooCommercePort';

export class AddToCartHandler {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly wooCommerce: IWooCommercePort,
  ) {}

  async handle(command: AddToCartCommand): Promise<Cart> {
    const product = await this.wooCommerce.getProduct(command.productId);
    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    let cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) {
      cart = Cart.create(command.userId);
    }

    cart.addItem(command.productId, command.quantity, command.unitPrice);
    await this.cartRepository.save(cart);

    return cart;
  }
}
