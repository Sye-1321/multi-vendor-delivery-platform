import { Types } from 'mongoose';
import {
  AccountActionPurpose,
  IAccountActionPayload,
  ISignUpTokens,
  IUserPayload,
} from './auth.interface';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';

export interface IAuthService {
  generateAuthTokens(payload: IUserPayload): Promise<ISignUpTokens>;
  hashData(prop: string, saltRound: number): Promise<string>;
  updateRefreshToken(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
    refreshToken: string,
  ): Promise<ISignUpTokens>;
  nullifyRefreshToken(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
  );
  logOut(model: GenericDocumentRepository<any, any>, userId: Types.ObjectId);
  generateAccountActionToken(
    userId: Types.ObjectId,
    purpose: AccountActionPurpose,
    tokenId: string,
    email?: string,
  ): Promise<string>;
  verifyAccountActionToken(
    token: string,
    expectedPurpose: AccountActionPurpose,
  ): Promise<IAccountActionPayload>;
}
