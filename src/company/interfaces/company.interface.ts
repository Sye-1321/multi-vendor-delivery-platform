import { Types } from 'mongoose';
import { Audit } from 'src/domain/audit/audit';
import { User } from 'src/user/user';

export interface ISavedAddress {
  city: string;
  subCity: string;
}

export interface ICompany {
  logo: string;
  name: string;
  phoneNumber: string;
  ownerId: Types.ObjectId;
  audit: Audit;
  owner: User;
  savedAddress: ISavedAddress;
}

export interface IUpdateCompany {
  logo?: string;
  name?: string;
  phoneNumber?: string;
  savedAddress?: ISavedAddress;
  auditModifiedBy: string;
  auditModifiedDateTime: string;
}

export interface IUpdateCompanyAdmin {
  ownerId: Types.ObjectId;
  owner: User;
  auditModifiedBy: string;
  auditModifiedDateTime: string;
}
