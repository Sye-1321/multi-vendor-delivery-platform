import { Types } from 'mongoose';
import { IRestaurantReviewResponse } from './restaurant-review-response.interface';
import {
  CreateReviewDTO,
  UpdateReviewDTO,
} from 'src/system-review/dtos/system-review.dto';
import { Result } from 'src/domain/result/result';

export interface IRestaurantReviewService {
  createReview(
    restaurantId: Types.ObjectId,
    props: CreateReviewDTO,
  ): Promise<Result<IRestaurantReviewResponse>>;
  updateRestaurantReview(
    reviewId: Types.ObjectId,
    props: UpdateReviewDTO,
  ): Promise<Result<IRestaurantReviewResponse>>;
}
