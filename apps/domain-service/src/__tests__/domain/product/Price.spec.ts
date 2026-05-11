import { Price } from '../../../domain/product/value-objects/Price';

describe('Price Value Object', () => {
  it('should create a valid price', () => {
    const price = Price.create(99.99);
    expect(price.amount).toBe(99.99);
    expect(price.currency).toBe('BRL');
  });

  it('should create a price with custom currency', () => {
    const price = Price.create(10.00, 'USD');
    expect(price.currency).toBe('USD');
  });

  it('should throw error for negative amount', () => {
    expect(() => Price.create(-1)).toThrow('Price amount cannot be negative');
  });

  it('should allow zero price', () => {
    const price = Price.create(0);
    expect(price.amount).toBe(0);
  });

  it('should add two prices of same currency', () => {
    const p1 = Price.create(10.00);
    const p2 = Price.create(5.50);
    const result = p1.add(p2);
    expect(result.amount).toBe(15.50);
  });

  it('should throw when adding prices of different currencies', () => {
    const p1 = Price.create(10.00, 'BRL');
    const p2 = Price.create(5.00, 'USD');
    expect(() => p1.add(p2)).toThrow('Cannot add prices with different currencies');
  });

  it('should multiply price by factor', () => {
    const price = Price.create(10.00);
    const result = price.multiply(3);
    expect(result.amount).toBe(30.00);
  });

  it('should return true for equal prices', () => {
    const p1 = Price.create(100, 'BRL');
    const p2 = Price.create(100, 'BRL');
    expect(p1.equals(p2)).toBe(true);
  });

  it('should return false for different amounts', () => {
    const p1 = Price.create(100, 'BRL');
    const p2 = Price.create(200, 'BRL');
    expect(p1.equals(p2)).toBe(false);
  });
});
