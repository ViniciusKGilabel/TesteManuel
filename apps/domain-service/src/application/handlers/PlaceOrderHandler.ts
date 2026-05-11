import { PlaceOrderCommand } from '../commands/PlaceOrderCommand';
import { Order } from '../../domain/order/entities/Order';
import { OrderItem } from '../../domain/order/value-objects/OrderItem';
import { IOrderRepository } from '../../domain/order/IOrderRepository';
import { IProductRepository } from '../../domain/product/IProductRepository';
import { OrderDTO } from '../dto/OrderDTO';

export class PlaceOrderHandler {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository
  ) {}

  async handle(command: PlaceOrderCommand): Promise<OrderDTO> {
    const orderItems: OrderItem[] = [];

    for (const input of command.items) {
      const product = await this.productRepository.findById(input.productId);
      if (!product) {
        throw new Error(`Product not found: ${input.productId}`);
      }
      if (!product.productStock.isAvailable()) {
        throw new Error(`Product out of stock: ${product.productName}`);
      }
      if (input.quantity > product.productStock.quantity) {
        throw new Error(`Insufficient stock for product: ${product.productName}`);
      }

      orderItems.push(OrderItem.create(input.productId, input.quantity, product.productPrice.amount));
      product.reserveStock(input.quantity);
      await this.productRepository.save(product);
    }

    const order = Order.place(command.userId, orderItems);
    await this.orderRepository.save(order);

    return new OrderDTO(order);
  }
}
