import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';

export interface IAuthStrategy {
  validate(request: Request, payload: any): unknown;
}

interface IPayload {
  email: string;
  role: Role;
}

export interface IUserPayload extends IPayload {
  userId: Types.ObjectId;
}

export interface IJwtPayload extends IPayload {
  sub: Types.ObjectId;
  sid?: string;
}
export interface ISignUpTokens {
  refreshToken: string;
  accessToken: string;
}

export interface ILogin {
  email: string;
  password: string;
}

export enum AccountActionPurpose {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_CHANGE = 'EMAIL_CHANGE',
}

export interface IAccountActionPayload {
  sub: string;
  purpose: AccountActionPurpose;
  jti: string;
  email?: string;
}
