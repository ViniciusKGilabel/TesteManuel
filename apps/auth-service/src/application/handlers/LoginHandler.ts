import { LoginCommand } from '../commands/LoginCommand';
import { AuthPayloadDTO } from '../dto/AuthPayloadDTO';
import { Email } from '../../domain/value-objects/Email';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ValidationError } from '@teste-manuel/shared-utils';

export class LoginHandler {
  constructor(private userRepository: IUserRepository) {}

  async handle(command: LoginCommand): Promise<AuthPayloadDTO> {
    const email = new Email(command.email);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    if (!user.verifyPassword(command.password)) {
      throw new ValidationError('Invalid email or password');
    }

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
