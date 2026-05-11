import { Email } from '../../../domain/value-objects/Email';

describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const email = Email.create('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('should throw error for invalid email format', () => {
    expect(() => Email.create('invalid-email')).toThrow('Invalid email format');
  });

  it('should throw error for empty email', () => {
    expect(() => Email.create('')).toThrow('Invalid email format');
  });

  it('should return true for equal emails', () => {
    const email1 = Email.create('test@example.com');
    const email2 = Email.create('test@example.com');
    expect(email1.equals(email2)).toBe(true);
  });

  it('should return false for different emails', () => {
    const email1 = Email.create('test1@example.com');
    const email2 = Email.create('test2@example.com');
    expect(email1.equals(email2)).toBe(false);
  });
});
