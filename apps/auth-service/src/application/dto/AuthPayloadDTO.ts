import { User } from '../../domain/entities/User';

export class AuthPayloadDTO {
  constructor(
    readonly user: {
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: Date;
    },
    readonly token: string
  ) {}

  static fromUser(user: User, token: string): AuthPayloadDTO {
    return new AuthPayloadDTO(
      {
        id: user.userId.value,
        email: user.userEmail.value,
        name: user.userName,
        role: user.userRole,
        createdAt: user.createdAt,
      },
      token
    );
  }
}
