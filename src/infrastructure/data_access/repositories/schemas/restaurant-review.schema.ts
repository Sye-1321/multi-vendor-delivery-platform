import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { UserDataModel } from './user.schema';
import { Type } from 'class-transformer';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { IRestaurantReviewModel } from '../models/resuarant-review-model.interface';

export type RestaurantReviewDocument = RestaurantReviewDataModel & Document;

@Schema({ versionKey: false })
export class RestaurantReviewDataModel
  extends BaseDocument
  implements IRestaurantReviewModel
{
  @Prop({ type: String, required: true })
  reviewText: string;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserDataModel.name,
    required: true,
  })
  userId: Types.ObjectId;

  @Type(() => UserDataModel)
  userDetails?: UserDataModel;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  restaurantId: Types.ObjectId;
}

export const RestaurantReviewSchema = SchemaFactory.createForClass(
  RestaurantReviewDataModel,
);

RestaurantReviewSchema.index(
  { userId: 1, restaurantId: 1 },
  { unique: true, name: 'uniq_restaurant_review_user_restaurant' },
);

RestaurantReviewSchema.virtual('userDetails', {
  ref: UserDataModel.name,
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});
