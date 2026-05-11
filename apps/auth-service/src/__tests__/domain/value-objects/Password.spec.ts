import { Password } from '../../../domain/value-objects/Password';

describe('Password Value Object', () => {
  it('should create a password with valid plain text', () => {
    const password = Password.create('SecurePassword123');
    expect(password.hashedValue).toBeDefined();
    expect(password.hashedValue).not.toBe('SecurePassword123');
  });

  it('should throw error for password shorter than minimum length', () => {
    expect(() => Password.create('short')).toThrow(
      'Password must be at least 8 characters'
    );
  });

  it('should verify correct password', () => {
    const plainPassword = 'SecurePassword123';
    const password = Password.create(plainPassword);
    expect(password.verify(plainPassword)).toBe(true);
  });

  it('should not verify incorrect password', () => {
    const password = Password.create('SecurePassword123');
    expect(password.verify('WrongPassword123')).toBe(false);
  });

  it('should return true for equal password hashes', () => {
    const plainPassword = 'SecurePassword123';
    const password1 = Password.create(plainPassword);
    const password2 = Password.create(plainPassword);
    expect(password1.verify(plainPassword)).toBe(true);
    expect(password2.verify(plainPassword)).toBe(true);
  });
});
