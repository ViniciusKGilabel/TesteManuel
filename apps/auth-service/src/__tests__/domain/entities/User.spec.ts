import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { UserCreatedEvent } from '../../../domain/events/UserCreatedEvent';

describe('User Aggregate Root', () => {
  it('should create a new user with factory method', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user = User.create(email, password, 'John Doe');
    
    expect(user.userId).toBeDefined();
    expect(user.userEmail.equals(email)).toBe(true);
    expect(user.userName).toBe('John Doe');
    expect(user.userRole).toBe('USER');
  });

  it('should publish UserCreatedEvent when user is created', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user = User.create(email, password, 'John Doe');
    const events = user.events;
    
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(UserCreatedEvent);
    const createdEvent = events[0] as UserCreatedEvent;
    expect(createdEvent.email).toBe('test@example.com');
  });

  it('should verify correct password', () => {
    const email = Email.create('test@example.com');
    const plainPassword = 'SecurePassword123';
    const password = Password.create(plainPassword);
    
    const user = User.create(email, password, 'John Doe');
    
    expect(user.verifyPassword(plainPassword)).toBe(true);
  });

  it('should not verify incorrect password', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user = User.create(email, password, 'John Doe');
    
    expect(user.verifyPassword('WrongPassword')).toBe(false);
  });

  it('should change password if current password is correct', () => {
    const email = Email.create('test@example.com');
    const oldPassword = Password.create('OldPassword123');
    const user = User.create(email, oldPassword, 'John Doe');
    
    const newPassword = Password.create('NewPassword123');
    user.changePassword('OldPassword123', newPassword);
    
    expect(user.verifyPassword('NewPassword123')).toBe(true);
    expect(user.verifyPassword('OldPassword123')).toBe(false);
  });

  it('should throw error when changing password with wrong current password', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    const user = User.create(email, password, 'John Doe');
    
    const newPassword = Password.create('NewPassword123');
    
    expect(() => {
      user.changePassword('WrongPassword', newPassword);
    }).toThrow('Current password is incorrect');
  });

  it('should return true for equal users', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user1 = User.create(email, password, 'John Doe');
    
    expect(user1.equals(user1)).toBe(true);
  });
});
