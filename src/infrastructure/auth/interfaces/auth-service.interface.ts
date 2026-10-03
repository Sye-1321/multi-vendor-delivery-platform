import { Types } from 'mongoose';
import { ISignUpTokens, IUserPayload } from './auth.interface';
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
}
