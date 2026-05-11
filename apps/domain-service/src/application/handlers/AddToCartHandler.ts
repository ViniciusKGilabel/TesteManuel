import { AddToCartCommand } from '../commands/AddToCartCommand';
import { Cart } from '../../domain/cart/entities/Cart';
import { ICartRepository } from '../../domain/cart/ICartRepository';

export class AddToCartHandler {
  constructor(private cartRepository: ICartRepository) {}

  async handle(command: AddToCartCommand): Promise<Cart> {
    let cart = await this.cartRepository.findByUserId(command.userId);

    if (!cart) {
      cart = Cart.create(command.userId);
    }

    cart.addItem(command.productId, command.quantity, command.unitPrice);
    await this.cartRepository.save(cart);

    return cart;
  }
}
