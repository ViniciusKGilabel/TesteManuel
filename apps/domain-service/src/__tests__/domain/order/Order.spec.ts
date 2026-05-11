import { Order } from '../../../domain/order/entities/Order';
import { OrderItem } from '../../../domain/order/value-objects/OrderItem';
import { OrderPlacedEvent } from '../../../domain/order/events/OrderPlacedEvent';

describe('Order Aggregate', () => {
  const makeItems = () => [
    OrderItem.create('prod-1', 2, 50.00),
    OrderItem.create('prod-2', 1, 30.00),
  ];

  it('should place an order with valid data', () => {
    const order = Order.place('user-1', makeItems());
    expect(order.orderId).toBeDefined();
    expect(order.orderUserId).toBe('user-1');
    expect(order.orderItems).toHaveLength(2);
    expect(order.orderStatus).toBe('PENDING');
  });

  it('should calculate correct total', () => {
    const order = Order.place('user-1', makeItems());
    expect(order.total).toBe(130.00);
  });

  it('should publish OrderPlacedEvent on creation', () => {
    const order = Order.place('user-1', makeItems());
    const events = order.events;
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderPlacedEvent);
    const event = events[0] as OrderPlacedEvent;
    expect(event.userId).toBe('user-1');
    expect(event.itemCount).toBe(2);
  });

  it('should throw for empty user ID', () => {
    expect(() => Order.place('', makeItems())).toThrow('User ID is required');
  });

  it('should throw for empty items', () => {
    expect(() => Order.place('user-1', [])).toThrow('Order must have at least one item');
  });

  it('should confirm a pending order', () => {
    const order = Order.place('user-1', makeItems());
    order.confirm();
    expect(order.orderStatus).toBe('CONFIRMED');
  });

  it('should throw when confirming non-pending order', () => {
    const order = Order.place('user-1', makeItems());
    order.confirm();
    expect(() => order.confirm()).toThrow('Only pending orders can be confirmed');
  });

  it('should ship a confirmed order', () => {
    const order = Order.place('user-1', makeItems());
    order.confirm();
    order.ship();
    expect(order.orderStatus).toBe('SHIPPED');
  });

  it('should throw when shipping non-confirmed order', () => {
    const order = Order.place('user-1', makeItems());
    expect(() => order.ship()).toThrow('Only confirmed orders can be shipped');
  });

  it('should deliver a shipped order', () => {
    const order = Order.place('user-1', makeItems());
    order.confirm();
    order.ship();
    order.deliver();
    expect(order.orderStatus).toBe('DELIVERED');
  });

  it('should cancel a pending order', () => {
    const order = Order.place('user-1', makeItems());
    order.cancel();
    expect(order.orderStatus).toBe('CANCELLED');
  });

  it('should throw when cancelling a shipped order', () => {
    const order = Order.place('user-1', makeItems());
    order.confirm();
    order.ship();
    expect(() => order.cancel()).toThrow('Cannot cancel a delivered or shipped order');
  });
});
