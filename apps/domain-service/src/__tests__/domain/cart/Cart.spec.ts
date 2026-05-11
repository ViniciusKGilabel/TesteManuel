import { Cart } from '../../../domain/cart/entities/Cart';

describe('Cart Aggregate', () => {
  it('should create an empty cart for user', () => {
    const cart = Cart.create('user-1');
    expect(cart.cartId).toBeDefined();
    expect(cart.cartUserId).toBe('user-1');
    expect(cart.cartItems).toHaveLength(0);
    expect(cart.total).toBe(0);
    expect(cart.itemCount).toBe(0);
  });

  it('should throw for empty user ID', () => {
    expect(() => Cart.create('')).toThrow('User ID is required');
  });

  it('should add an item to the cart', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 2, 50.00);
    expect(cart.cartItems).toHaveLength(1);
    expect(cart.cartItems[0].quantity).toBe(2);
    expect(cart.total).toBe(100.00);
  });

  it('should accumulate quantity for existing product', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 2, 50.00);
    cart.addItem('prod-1', 3, 50.00);
    expect(cart.cartItems).toHaveLength(1);
    expect(cart.cartItems[0].quantity).toBe(5);
  });

  it('should add multiple different products', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 1, 10.00);
    cart.addItem('prod-2', 2, 20.00);
    expect(cart.cartItems).toHaveLength(2);
    expect(cart.total).toBe(50.00);
    expect(cart.itemCount).toBe(3);
  });

  it('should remove an item from cart', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 1, 10.00);
    cart.removeItem('prod-1');
    expect(cart.cartItems).toHaveLength(0);
  });

  it('should throw when removing non-existent item', () => {
    const cart = Cart.create('user-1');
    expect(() => cart.removeItem('non-existent')).toThrow('Item not found in cart');
  });

  it('should update item quantity', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 2, 50.00);
    cart.updateQuantity('prod-1', 5);
    expect(cart.cartItems[0].quantity).toBe(5);
  });

  it('should throw when updating quantity of non-existent item', () => {
    const cart = Cart.create('user-1');
    expect(() => cart.updateQuantity('non-existent', 1)).toThrow('Item not found in cart');
  });

  it('should throw when adding item with invalid quantity', () => {
    const cart = Cart.create('user-1');
    expect(() => cart.addItem('prod-1', 0, 10.00)).toThrow('Quantity must be a positive integer');
    expect(() => cart.addItem('prod-1', -1, 10.00)).toThrow('Quantity must be a positive integer');
  });

  it('should clear the cart', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 1, 10.00);
    cart.addItem('prod-2', 2, 20.00);
    cart.clear();
    expect(cart.cartItems).toHaveLength(0);
    expect(cart.total).toBe(0);
  });
});
