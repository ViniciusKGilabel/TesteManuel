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

  it('should throw when updating to invalid quantity', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 2, 10.00);
    expect(() => cart.updateQuantity('prod-1', 0)).toThrow('Quantity must be a positive integer');
    expect(() => cart.updateQuantity('prod-1', -1)).toThrow('Quantity must be a positive integer');
    expect(() => cart.updateQuantity('prod-1', 1.5)).toThrow('Quantity must be a positive integer');
  });

  it('should throw when adding item with invalid quantity', () => {
    const cart = Cart.create('user-1');
    expect(() => cart.addItem('prod-1', 0, 10.00)).toThrow('Quantity must be a positive integer');
    expect(() => cart.addItem('prod-1', -1, 10.00)).toThrow('Quantity must be a positive integer');
    expect(() => cart.addItem('prod-1', 1.5, 10.00)).toThrow('Quantity must be a positive integer');
  });

  it('should throw when adding item with empty product ID', () => {
    const cart = Cart.create('user-1');
    expect(() => cart.addItem('', 1, 10.00)).toThrow('Product ID is required');
  });

  it('should throw when adding item with negative unit price', () => {
    const cart = Cart.create('user-1');
    expect(() => cart.addItem('prod-1', 1, -0.01)).toThrow('Unit price cannot be negative');
  });

  it('should allow adding item with zero unit price', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 1, 0);
    expect(cart.cartItems[0].unitPrice).toBe(0);
    expect(cart.total).toBe(0);
  });

  it('should clear the cart', () => {
    const cart = Cart.create('user-1');
    cart.addItem('prod-1', 1, 10.00);
    cart.addItem('prod-2', 2, 20.00);
    cart.clear();
    expect(cart.cartItems).toHaveLength(0);
    expect(cart.total).toBe(0);
  });

  it('should expose cartUpdatedAt which changes after mutations', () => {
    const cart = Cart.create('user-1');
    const before = cart.cartUpdatedAt;
    cart.addItem('prod-1', 1, 10.00);
    expect(cart.cartUpdatedAt).toBeInstanceOf(Date);
    expect(cart.cartUpdatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('should identify equal carts by ID', () => {
    const cart = Cart.create('user-1');
    expect(cart.equals(cart)).toBe(true);
  });

  it('should identify different carts as not equal', () => {
    const cart1 = Cart.create('user-1');
    const cart2 = Cart.create('user-1');
    expect(cart1.equals(cart2)).toBe(false);
  });

  describe('Cart.reconstitute', () => {
    it('should reconstitute a cart from valid persisted state', () => {
      const cart = Cart.reconstitute({
        id: 'cart-abc',
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 2, unitPrice: 15.00 }],
        updatedAt: new Date('2026-01-01'),
      });
      expect(cart.cartId).toBe('cart-abc');
      expect(cart.cartItems).toHaveLength(1);
      expect(cart.total).toBe(30.00);
    });

    it('should reconstitute an empty cart', () => {
      const cart = Cart.reconstitute({
        id: 'cart-empty',
        userId: 'user-2',
        items: [],
        updatedAt: new Date(),
      });
      expect(cart.cartItems).toHaveLength(0);
      expect(cart.total).toBe(0);
    });

    it('should throw when reconstituting with empty product ID', () => {
      expect(() =>
        Cart.reconstitute({
          id: 'cart-1',
          userId: 'user-1',
          items: [{ productId: '', quantity: 1, unitPrice: 10 }],
          updatedAt: new Date(),
        }),
      ).toThrow('Product ID is required');
    });

    it('should throw when reconstituting with zero quantity', () => {
      expect(() =>
        Cart.reconstitute({
          id: 'cart-1',
          userId: 'user-1',
          items: [{ productId: 'prod-1', quantity: 0, unitPrice: 10 }],
          updatedAt: new Date(),
        }),
      ).toThrow('Quantity must be a positive integer');
    });

    it('should throw when reconstituting with fractional quantity', () => {
      expect(() =>
        Cart.reconstitute({
          id: 'cart-1',
          userId: 'user-1',
          items: [{ productId: 'prod-1', quantity: 1.5, unitPrice: 10 }],
          updatedAt: new Date(),
        }),
      ).toThrow('Quantity must be a positive integer');
    });

    it('should throw when reconstituting with negative unit price', () => {
      expect(() =>
        Cart.reconstitute({
          id: 'cart-1',
          userId: 'user-1',
          items: [{ productId: 'prod-1', quantity: 1, unitPrice: -5 }],
          updatedAt: new Date(),
        }),
      ).toThrow('Unit price cannot be negative');
    });
  });

  describe('Domain events', () => {
    it('should emit CartItemAddedEvent when item is added', () => {
      const cart = Cart.create('user-1');
      cart.addItem('prod-1', 2, 25.00);
      const events = cart.events;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('CartItemAdded');
    });

    it('should emit CartItemRemovedEvent when item is removed', () => {
      const cart = Cart.create('user-1');
      cart.addItem('prod-1', 1, 10.00);
      cart.clearEvents();
      cart.removeItem('prod-1');
      const events = cart.events;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('CartItemRemoved');
    });

    it('should emit CartItemQuantityUpdatedEvent when quantity changes', () => {
      const cart = Cart.create('user-1');
      cart.addItem('prod-1', 1, 10.00);
      cart.clearEvents();
      cart.updateQuantity('prod-1', 5);
      const events = cart.events;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('CartItemQuantityUpdated');
    });
  });
});
