import { RegisterHandler } from '../../../application/handlers/RegisterHandler';
import { RegisterCommand } from '../../../application/commands/RegisterCommand';
import { Email } from '../../../domain/value-objects/Email';
import { MockUserRepository } from './MockUserRepository';
import { ValidationError } from '@teste-manuel/shared-utils';

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let repository: MockUserRepository;

  beforeEach(() => {
    repository = new MockUserRepository();
    handler = new RegisterHandler(repository);
  });

  it('should register a new user successfully', async () => {
    const command = new RegisterCommand('user@example.com', 'SecurePass123', 'John Doe');
    const result = await handler.handle(command);

    expect(result.user.email).toBe('user@example.com');
    expect(result.user.name).toBe('John Doe');
    expect(result.user.role).toBe('USER');
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should persist the user in the repository', async () => {
    const command = new RegisterCommand('user@example.com', 'SecurePass123', 'John Doe');
    const result = await handler.handle(command);

    const savedUser = await repository.findByEmail(new Email('user@example.com'));
    expect(savedUser).not.toBeNull();
    expect(savedUser?.userId.value).toBe(result.user.id);
  });

  it('should publish UserCreatedEvent', async () => {
    const command = new RegisterCommand('user@example.com', 'SecurePass123', 'John Doe');
    const result = await handler.handle(command);

    const savedUser = await repository.findByEmail(new Email('user@example.com'));
    const events = savedUser?.events || [];
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventName).toBe('UserCreated');
  });

  it('should throw ValidationError if email already exists', async () => {
    const command = new RegisterCommand('user@example.com', 'SecurePass123', 'John Doe');
    await handler.handle(command);

    const duplicateCommand = new RegisterCommand('user@example.com', 'Password456', 'Jane Doe');
    await expect(handler.handle(duplicateCommand)).rejects.toThrow(ValidationError);
  });

  it('should generate a valid token', async () => {
    const command = new RegisterCommand('user@example.com', 'SecurePass123', 'John Doe');
    const result = await handler.handle(command);

    const decodedToken = JSON.parse(Buffer.from(result.token, 'base64').toString('utf-8'));
    expect(decodedToken.sub).toBe(result.user.id);
    expect(decodedToken.iat).toBeDefined();
    expect(typeof decodedToken.iat).toBe('number');
  });

  it('should create user with USER role by default', async () => {
    const command = new RegisterCommand('user@example.com', 'SecurePass123', 'John Doe');
    const result = await handler.handle(command);

    expect(result.user.role).toBe('USER');
  });
});
