import { Order } from '../../domain/order/entities/Order';

export class OrderDTO {
  id: string;
  userId: string;
  items: { productId: string; quantity: number; unitPrice: number; subtotal: number }[];
  total: number;
  status: string;
  createdAt: Date;

  constructor(order: Order) {
    this.id = order.orderId;
    this.userId = order.orderUserId;
    this.items = order.orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));
    this.total = order.total;
    this.status = order.orderStatus;
    this.createdAt = order.createdAt;
  }
}
