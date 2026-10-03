import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { UserDataModel } from './user.schema';
import { Type } from 'class-transformer';
import { ISystemReviewModel } from '../models/system-review-model.interface';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';

export type SystemReviewDocument = SystemReviewDataModel & Document;

@Schema({ versionKey: false })
export class SystemReviewDataModel
  extends BaseDocument
  implements ISystemReviewModel
{
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, required: true })
  reviewText: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserDataModel.name,
    required: true,
  })
  userId: Types.ObjectId;

  @Type(() => UserDataModel)
  userDetails?: UserDataModel;
}

export const SystemReviewSchema = SchemaFactory.createForClass(
  SystemReviewDataModel,
);

SystemReviewSchema.pre('save', function (next) {
  if (this.isNew && this.reviewText && this.reviewText.length < 150) {
    return next(new Error('Review text must be at least 150 characters long.'));
  }
  next();
});

SystemReviewSchema.virtual('userDetails', {
  ref: UserDataModel.name,
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  autopopulate: true,
});
