import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import {
  IPublicUserResponse,
  IUserResponse,
} from 'src/user/interfaces/user-response.interface';

export interface IRestaurantReviewResponse extends IAudit {
  id: Types.ObjectId;
  user: IUserResponse;
  rating: number;
  reviewText: string;
}

export interface IPublicRestaurantReviewResponse
  extends Omit<IRestaurantReviewResponse, 'user'> {
  user: IPublicUserResponse;
}
