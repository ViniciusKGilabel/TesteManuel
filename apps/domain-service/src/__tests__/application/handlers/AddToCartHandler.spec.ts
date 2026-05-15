import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { AddToCartHandler } from '../../../application/handlers/AddToCartHandler';
import { AddToCartCommand } from '../../../application/commands/AddToCartCommand';
import { ICartRepository } from '../../../domain/cart/ICartRepository';
import { Cart } from '../../../domain/cart/entities/Cart';

class MockCartRepository implements ICartRepository {
  private store = new InMemoryRepository<Cart>((c: Cart) => c.cartId);

  async save(cart: Cart): Promise<void> {
    await this.store.save(cart);
  }

  async findById(id: string): Promise<Cart | null> {
    return this.store.findById(id);
  }

  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }

  async findAll(): Promise<Cart[]> {
    return this.store.findAll();
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const all = await this.store.findAll();
    return all.find((c) => c.cartUserId === userId) ?? null;
  }
}

describe('AddToCartHandler', () => {
  let repo: MockCartRepository;
  let handler: AddToCartHandler;

  beforeEach(() => {
    repo = new MockCartRepository();
    handler = new AddToCartHandler(repo);
  });

  it('creates a new cart when none exists for the user', async () => {
    const cmd = new AddToCartCommand('user-1', 'prod-1', 2, 10.0);

    const cart = await handler.handle(cmd);

    expect(cart.cartUserId).toBe('user-1');
    expect(cart.cartItems).toHaveLength(1);
    expect(cart.cartItems[0].productId).toBe('prod-1');
    expect(cart.cartItems[0].quantity).toBe(2);
  });

  it('saves the cart to the repository', async () => {
    const cmd = new AddToCartCommand('user-1', 'prod-1', 1, 5.0);

    const cart = await handler.handle(cmd);

    const saved = await repo.findById(cart.cartId);
    expect(saved).not.toBeNull();
    expect(saved!.cartItems).toHaveLength(1);
  });

  it('adds to an existing cart for the same user', async () => {
    const first = new AddToCartCommand('user-1', 'prod-1', 1, 10.0);
    await handler.handle(first);

    const second = new AddToCartCommand('user-1', 'prod-2', 3, 5.0);
    const cart = await handler.handle(second);

    expect(cart.cartItems).toHaveLength(2);
  });

  it('accumulates quantity when the same product is added twice', async () => {
    const cmd = new AddToCartCommand('user-1', 'prod-1', 2, 10.0);
    await handler.handle(cmd);

    const cmd2 = new AddToCartCommand('user-1', 'prod-1', 3, 10.0);
    const cart = await handler.handle(cmd2);

    expect(cart.cartItems).toHaveLength(1);
    expect(cart.cartItems[0].quantity).toBe(5);
  });

  it('returns the cart with the correct total', async () => {
    const cmd = new AddToCartCommand('user-1', 'prod-1', 2, 10.0);

    const cart = await handler.handle(cmd);

    expect(cart.total).toBe(20.0);
  });

  it('does not mix carts for different users', async () => {
    await handler.handle(new AddToCartCommand('user-1', 'prod-1', 1, 10.0));
    await handler.handle(new AddToCartCommand('user-2', 'prod-2', 2, 5.0));

    const cart1 = await repo.findByUserId('user-1');
    const cart2 = await repo.findByUserId('user-2');

    expect(cart1!.cartItems).toHaveLength(1);
    expect(cart2!.cartItems).toHaveLength(1);
    expect(cart1!.cartItems[0].productId).toBe('prod-1');
    expect(cart2!.cartItems[0].productId).toBe('prod-2');
  });
});
