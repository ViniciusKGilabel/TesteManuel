import { AggregateRoot } from '@teste-manuel/domain';
import { generateId } from '@teste-manuel/shared-utils';
import { OrderItem } from '../value-objects/OrderItem';
import { OrderPlacedEvent } from '../events/OrderPlacedEvent';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderProps {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
}

export class Order extends AggregateRoot<string> {
  private userId: string;
  private items: OrderItem[];
  private status: OrderStatus;

  private constructor(props: OrderProps) {
    super(props.id, props.createdAt);
    this.userId = props.userId;
    this.items = props.items;
    this.status = props.status;
  }

  static place(userId: string, items: OrderItem[]): Order {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    const orderId = generateId();
    const order = new Order({
      id: orderId,
      userId,
      items,
      status: 'PENDING',
      createdAt: new Date(),
    });

    order.addDomainEvent(
      new OrderPlacedEvent(orderId, userId, order.total, items.length)
    );

    return order;
  }

  static reconstitute(props: OrderProps): Order {
    return new Order(props);
  }

  confirm(): void {
    if (this.status !== 'PENDING') {
      throw new Error('Only pending orders can be confirmed');
    }
    this.status = 'CONFIRMED';
  }

  ship(): void {
    if (this.status !== 'CONFIRMED') {
      throw new Error('Only confirmed orders can be shipped');
    }
    this.status = 'SHIPPED';
  }

  deliver(): void {
    if (this.status !== 'SHIPPED') {
      throw new Error('Only shipped orders can be delivered');
    }
    this.status = 'DELIVERED';
  }

  cancel(): void {
    if (this.status === 'DELIVERED' || this.status === 'SHIPPED') {
      throw new Error('Cannot cancel a delivered or shipped order');
    }
    this.status = 'CANCELLED';
  }

  get orderId(): string {
    return this._id;
  }

  get orderUserId(): string {
    return this.userId;
  }

  get orderItems(): OrderItem[] {
    return [...this.items];
  }

  get orderStatus(): OrderStatus {
    return this.status;
  }

  get total(): number {
    return Math.round(
      this.items.reduce((sum, item) => sum + item.subtotal, 0) * 100
    ) / 100;
  }

  equals(other: Order): boolean {
    return this._id === other._id;
  }
}
