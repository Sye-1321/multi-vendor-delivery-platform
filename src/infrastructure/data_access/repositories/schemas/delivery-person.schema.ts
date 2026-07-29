import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import {
  IDeliveryPersonModel,
  ISavedAddress,
} from '../models/deliveryperson-model.interface';
import { Type } from 'class-transformer';
import { RestaurantDataModel } from './restaurant.schema';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import {
  AvailabilityStatus,
  DeliveryPersonOwnership,
  DeliveryPersonStatus,
} from 'src/delivery-person/constants/constants';

export type DeliveryPersonDocument = DeliveryPersonDataModel & Document;

@Schema({ versionKey: false })
export class DeliveryPersonDataModel
  extends BaseDocument
  implements IDeliveryPersonModel
{
  @Prop({ type: String, required: true })
  profileImage: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  phoneNumber: string;

  @Prop({ type: String, required: true, enum: AvailabilityStatus })
  availabilityStatus: AvailabilityStatus;

  @Prop({ type: String, required: true, enum: DeliveryPersonStatus })
  status: DeliveryPersonStatus;

  @Prop({ type: String, required: true, enum: DeliveryPersonOwnership })
  deliveryType: DeliveryPersonOwnership;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantDataModel',
    required: false,
    default: null,
    nullable: true,
  })
  @Type(() => RestaurantDataModel)
  restaurantId: Types.ObjectId | null;

  @Prop({
    type: {
      city: { type: String, required: true },
      subCity: { type: String, required: true },
    },
    required: true,
  })
  savedAddress: ISavedAddress;
}

export const DeliveryPersonSchema = SchemaFactory.createForClass(
  DeliveryPersonDataModel,
);

DeliveryPersonSchema.index({
  deliveryType: 1,
  restaurantId: 1,
  status: 1,
  availabilityStatus: 1,
});
