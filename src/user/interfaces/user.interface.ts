import { Role } from 'src/application/constants/constants';
import { UserStatus } from '../constants/constants';
import { Audit } from 'src/domain/audit/audit';
export interface ISavedAddress {
  city: string;
  subCity: string;
}

export interface IUser {
  name: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: Role;
  status?: UserStatus;
  refreshTokenHash?: string;
  audit: Audit;
  savedAddress?: ISavedAddress;
}

export interface IUpdateProfile {
  name?: string;
  phoneNumber?: string;
  savedAddress?: ISavedAddress;
  auditModifiedBy: string;
  auditModifiedDateTime: string;
}

export interface IAdminUpdateUser {
  status?: UserStatus;
  roles?: Role;
  auditModifiedBy: string;
  auditModifiedDateTime: string;
}
