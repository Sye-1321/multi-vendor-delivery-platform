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

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserDataModel.name })
  @Type(() => UserDataModel)
  user: UserDataModel;

  @Prop({ type: Types.ObjectId, required: true })
  restaurantId: Types.ObjectId;
}

export const RestaurantReviewSchema = SchemaFactory.createForClass(
  RestaurantReviewDataModel,
);
