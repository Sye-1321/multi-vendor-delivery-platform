import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IRestaurantDataModel } from '../models/restaurant-model.interface';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { RestaurantStatus } from 'src/restaurant/constants/constants';
import { CompanyDataModel } from './company.schema';
import { UserDataModel } from './user.schema';
import { RestaurantReviewDataModel } from './restaurant-review.schema';
import { MenuDataModel } from './menu.schema';

export type RestaurantDocument = RestaurantDataModel & Document;

@Schema({ versionKey: false })
export class RestaurantDataModel
  extends BaseDocument
  implements IRestaurantDataModel
{
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: {
      city: { type: String, required: true },
      subCity: { type: String, required: true },
    },
    required: true,
  })
  savedAddress: {
    city: string;
    subCity: string;
  };

  @Prop({ type: String, required: true })
  phoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: CompanyDataModel.name, required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: CompanyDataModel.name })
  company: CompanyDataModel;

  @Prop({ type: Boolean, default: false })
  deliveryPersonAvailability: boolean;

  @Prop({ type: Types.ObjectId, ref: UserDataModel.name, required: true })
  restaurantAdminId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: UserDataModel.name,
    required: true,
  })
  restaurantAdmin: UserDataModel;

  @Prop({
    type: String,
    enum: Object.values(RestaurantStatus),
    default: RestaurantStatus.ACTIVE,
  })
  status: RestaurantStatus;

  @Prop({ type: String, required: true })
  openingHours: string;

  @Prop({ type: String, required: true })
  closingHours: string;

  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: String, required: true })
  logo: string;

  @Prop({ type: [Types.ObjectId], ref: MenuDataModel.name })
  menus: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: RestaurantReviewDataModel.name })
  reviews: Types.ObjectId[];
}

export const RestaurantSchema =
  SchemaFactory.createForClass(RestaurantDataModel);

RestaurantSchema.virtual('menusDetail', {
  ref: MenuDataModel.name,
  localField: 'menus',
  foreignField: '_id',
  justOne: false,
  autopopulate: true,
});

RestaurantSchema.virtual('reviewsDetail', {
  ref: RestaurantReviewDataModel.name,
  localField: 'reviews',
  foreignField: '_id',
  justOne: false,
  autopopulate: true,
});

RestaurantSchema.index({ restaurantAdminId: 1 }, { unique: true });
RestaurantSchema.index({ companyId: 1, status: 1 });
