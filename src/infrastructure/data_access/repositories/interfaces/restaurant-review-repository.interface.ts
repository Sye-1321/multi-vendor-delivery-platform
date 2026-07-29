import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { RestaurantReviewDataModel } from '../schemas/restaurant-review.schema';
import { Types } from 'mongoose';
import { RestaurantReview } from 'src/restaurant-review/restaurant-review';
import { Result } from 'src/domain/result/result';

export interface IRestaurantReviewRepository extends IGenericDocument<RestaurantReview, RestaurantReviewDataModel> {
    createRestaurantReview(model: RestaurantReviewDataModel): Promise<Result<RestaurantReview>>;
    getRestaurantReviewById(id: Types.ObjectId): Promise<Result<RestaurantReview>>;
    deleteRestaurantReviewById(id: Types.ObjectId): Promise<Result<void>>;
    updateRestaurantReviewById(id: Types.ObjectId,updateData: Partial<RestaurantReviewDataModel>): Promise<Result<RestaurantReview>>;
}