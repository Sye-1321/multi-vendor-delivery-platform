import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';

export interface IAccountActionStateData {
  readonly tokenHash: string;
  readonly email?: string;
}

export interface IAccountActionsData {
  readonly EMAIL_VERIFICATION?: IAccountActionStateData;
  readonly ADMIN_REGISTRATION?: IAccountActionStateData;
  readonly PASSWORD_RESET?: IAccountActionStateData;
  readonly EMAIL_CHANGE?: IAccountActionStateData;
}

export interface IUserData {
  readonly name: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly refreshTokenHash?: string;
  readonly accountActions?: IAccountActionsData;
  readonly savedAddress?: { city: string; subCity: string };
}
