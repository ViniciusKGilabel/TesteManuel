import { RegisterCommand } from '../commands/RegisterCommand';
import { AuthPayloadDTO } from '../dto/AuthPayloadDTO';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ValidationError } from '@teste-manuel/shared-utils';

export class RegisterHandler {
  constructor(private userRepository: IUserRepository) {}

  async handle(command: RegisterCommand): Promise<AuthPayloadDTO> {
    const email = new Email(command.email);

    const emailExists = await this.userRepository.emailExists(email);
    if (emailExists) {
      throw new ValidationError('Email already registered');
    }

    const password = Password.create(command.password);
    const user = User.create(email, password, command.name);
    await this.userRepository.save(user);

    const token = this.generateToken(user.userId.value);
    return AuthPayloadDTO.fromUser(user, token);
  }

  private generateToken(userId: string): string {
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}
