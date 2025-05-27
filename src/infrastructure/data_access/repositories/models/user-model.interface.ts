import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';

export interface IUserData {
  readonly name: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly refreshTokenHash?: string;
  readonly savedAddress?: { city: string; subCity: string };
}
