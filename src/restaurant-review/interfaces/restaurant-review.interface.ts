import { Types } from 'mongoose';
import { Audit } from 'src/domain/audit/audit';
import { User } from 'src/user/user';

export interface IRestaurantReview {
  userId: Types.ObjectId;
  user: User;
  restaurantId: Types.ObjectId;
  rating: number;
  reviewText: string;
  audit: Audit;
}
