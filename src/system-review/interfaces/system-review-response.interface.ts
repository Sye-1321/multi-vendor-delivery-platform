import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import {
  IPublicUserResponse,
  IUserResponse,
} from 'src/user/interfaces/user-response.interface';

export interface ISystemReviewResponse extends IAudit {
  id: Types.ObjectId;
  user: IUserResponse;
  rating: number;
  reviewText: string;
}

export interface IPublicSystemReviewResponse
  extends Omit<ISystemReviewResponse, 'user'> {
  user: IPublicUserResponse;
}
