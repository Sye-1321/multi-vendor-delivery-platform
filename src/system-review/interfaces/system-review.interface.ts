import { Types } from 'mongoose';
import { Audit } from 'src/domain/audit/audit';
import { User } from 'src/user/user';

export interface ISystemReview {
  userId: Types.ObjectId;
  user: User;
  rating: number;
  reviewText: string;
  audit: Audit;
}

export interface IUserUpdateReview {
  reviewText?: string;
  rating?: number;
  auditModifiedBy: string;
  auditModifiedDateTime: string;
}