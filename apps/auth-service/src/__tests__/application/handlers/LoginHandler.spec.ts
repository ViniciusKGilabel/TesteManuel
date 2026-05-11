import { LoginHandler } from '../../../application/handlers/LoginHandler';
import { LoginCommand } from '../../../application/commands/LoginCommand';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { User } from '../../../domain/entities/User';
import { MockUserRepository } from './MockUserRepository';
import { ValidationError } from '@teste-manuel/shared-utils';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let repository: MockUserRepository;

  beforeEach(async () => {
    repository = new MockUserRepository();
    handler = new LoginHandler(repository);

    const email = new Email('user@example.com');
    const password = Password.create('SecurePass123');
    const user = User.create(email, password, 'John Doe');
    await repository.save(user);
  });

  it('should login a user successfully', async () => {
    const command = new LoginCommand('user@example.com', 'SecurePass123');
    const result = await handler.handle(command);

    expect(result.user.email).toBe('user@example.com');
    expect(result.user.name).toBe('John Doe');
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should generate a valid token', async () => {
    const command = new LoginCommand('user@example.com', 'SecurePass123');
    const result = await handler.handle(command);

    const decodedToken = JSON.parse(Buffer.from(result.token, 'base64').toString('utf-8'));
    expect(decodedToken.sub).toBe(result.user.id);
    expect(decodedToken.iat).toBeDefined();
    expect(typeof decodedToken.iat).toBe('number');
  });

  it('should throw ValidationError for non-existent email', async () => {
    const command = new LoginCommand('nonexistent@example.com', 'SecurePass123');
    await expect(handler.handle(command)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for incorrect password', async () => {
    const command = new LoginCommand('user@example.com', 'WrongPassword');
    await expect(handler.handle(command)).rejects.toThrow(ValidationError);
  });

  it('should return generic error message for invalid credentials', async () => {
    const wrongEmailCommand = new LoginCommand('wrong@example.com', 'SecurePass123');
    await expect(handler.handle(wrongEmailCommand)).rejects.toThrow('Invalid email or password');

    const wrongPasswordCommand = new LoginCommand('user@example.com', 'WrongPassword');
    await expect(handler.handle(wrongPasswordCommand)).rejects.toThrow('Invalid email or password');
  });

  it('should return correct user data on successful login', async () => {
    const command = new LoginCommand('user@example.com', 'SecurePass123');
    const result = await handler.handle(command);

    expect(result.user.email).toBe('user@example.com');
    expect(result.user.name).toBe('John Doe');
    expect(result.user.role).toBe('USER');
    expect(result.user.createdAt).toBeInstanceOf(Date);
  });
});
