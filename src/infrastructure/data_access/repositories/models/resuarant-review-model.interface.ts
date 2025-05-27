import { Types } from 'mongoose';

export interface IRestaurantReviewModel {
  readonly userId: Types.ObjectId;
  readonly restaurantId: Types.ObjectId;
  readonly rating: number;
  readonly reviewText: string;
}
