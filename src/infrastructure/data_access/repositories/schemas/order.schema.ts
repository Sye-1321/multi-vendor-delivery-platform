import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { IOrderDataModel } from '../models/order-model.interface';
import { Type } from 'class-transformer';
import { CartDataModel } from './cart.schema';
import { DeliveryPersonDataModel } from './delivery-person.schema';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { OrderStatus, PaymentStatus } from 'src/order/constants/constants';

export type OrderDocument = OrderDataModel & Document;

@Schema({ versionKey: false })
export class OrderDataModel extends BaseDocument implements IOrderDataModel {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Restaurant' })
  restaurantId: Types.ObjectId;

  @Prop({
    type: {
      city: { type: String, required: true },
      subCity: { type: String, required: true },
    },
    required: true,
  })
  deliveryAddress: {
    city: string;
    subCity: string;
  };

  @Prop({ type: String, enum: Object.values(OrderStatus), required: true })
  status: OrderStatus;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: String, enum: Object.values(PaymentStatus), required: true })
  paymentStatus: PaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'DeliveryPerson' })
  deliveryPersonId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, required: false, ref: 'DeliveryPerson', default: null })
  @Type(() => DeliveryPersonDataModel)
  deliveryPerson?: DeliveryPersonDataModel;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CartDataModel' })
  @Type(() => CartDataModel)
  cart: CartDataModel;

}

export const OrderSchema = SchemaFactory.createForClass(OrderDataModel);