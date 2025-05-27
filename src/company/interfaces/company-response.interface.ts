import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import { IUserResponseDTO } from 'src/user/user.parser';
import { ISavedAddress } from './company.interface';

export interface ICompanyResponse extends IAudit {
  id: Types.ObjectId;
  logo: string;
  name: string;
  phoneNumber: string;
  ownerId: Types.ObjectId;
  savedAddress:ISavedAddress;
  owner: IUserResponseDTO;
}
