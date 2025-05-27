import { Types } from 'mongoose';
import { ISignUpTokens } from 'src/infrastructure/auth/interfaces/auth.interface';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';

export interface IUserResponse extends IAudit {
  id: Types.ObjectId;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  savedAddress?: object;
  tokens?: ISignUpTokens;
}

export interface IUserSignedInResponseDTO extends IUserResponse {
  tokenExpiresIn?: number;
}
