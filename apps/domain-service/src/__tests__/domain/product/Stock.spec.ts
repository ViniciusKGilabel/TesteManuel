import { Stock } from '../../../domain/product/value-objects/Stock';

describe('Stock Value Object', () => {
  it('should create valid stock', () => {
    const stock = Stock.create(100);
    expect(stock.quantity).toBe(100);
  });

  it('should allow zero stock', () => {
    const stock = Stock.create(0);
    expect(stock.quantity).toBe(0);
    expect(stock.isAvailable()).toBe(false);
  });

  it('should throw for negative quantity', () => {
    expect(() => Stock.create(-1)).toThrow('Stock quantity must be a non-negative integer');
  });

  it('should throw for non-integer quantity', () => {
    expect(() => Stock.create(1.5)).toThrow('Stock quantity must be a non-negative integer');
  });

  it('should report available when quantity > 0', () => {
    expect(Stock.create(10).isAvailable()).toBe(true);
  });

  it('should reserve stock correctly', () => {
    const stock = Stock.create(10);
    const reserved = stock.reserve(3);
    expect(reserved.quantity).toBe(7);
  });

  it('should throw when reserving more than available', () => {
    const stock = Stock.create(2);
    expect(() => stock.reserve(5)).toThrow('Insufficient stock');
  });

  it('should throw when reserving zero or negative', () => {
    const stock = Stock.create(10);
    expect(() => stock.reserve(0)).toThrow('Reserve amount must be positive');
  });

  it('should replenish stock', () => {
    const stock = Stock.create(5);
    const replenished = stock.replenish(10);
    expect(replenished.quantity).toBe(15);
  });

  it('should throw when replenishing with zero or negative', () => {
    const stock = Stock.create(5);
    expect(() => stock.replenish(-1)).toThrow('Replenish amount must be positive');
  });

  it('should return true for equal stocks', () => {
    expect(Stock.create(10).equals(Stock.create(10))).toBe(true);
  });

  it('should return false for different stocks', () => {
    expect(Stock.create(10).equals(Stock.create(20))).toBe(false);
  });
});
