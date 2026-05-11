import { GetOrdersQuery } from '../queries/GetOrdersQuery';
import { IOrderRepository } from '../../domain/order/IOrderRepository';
import { OrderDTO } from '../dto/OrderDTO';

export class GetOrdersHandler {
  constructor(private orderRepository: IOrderRepository) {}

  async handle(query: GetOrdersQuery): Promise<OrderDTO[]> {
    const orders = await this.orderRepository.findByUserId(query.userId);
    return orders.map((order) => new OrderDTO(order));
  }
}
