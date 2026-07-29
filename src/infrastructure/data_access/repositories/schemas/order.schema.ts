import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { IOrderDataModel } from '../models/order-model.interface';
import { Type } from 'class-transformer';
import { CartDataModel } from './cart.schema';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { OrderStatus, PaymentStatus } from 'src/order/constants/constants';
import { DeliveryPersonDataModel } from './delivery-person.schema';
import { Role } from 'src/application/constants/constants';
import { IOrderTransition } from 'src/order/interfaces/order.interface';

export type OrderDocument = OrderDataModel & Document;

@Schema({ _id: false, versionKey: false })
export class OrderTransitionDataModel implements IOrderTransition {
  @Prop({ type: String, enum: Object.values(OrderStatus), default: null })
  from: OrderStatus | null;

  @Prop({ type: String, enum: Object.values(OrderStatus), required: true })
  to: OrderStatus;

  @Prop({ type: Types.ObjectId, required: true, ref: 'UserDataModel' })
  actorId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(Role), required: true })
  actorRole: Role;

  @Prop({ type: String, required: true })
  occurredAt: string;

  @Prop({ type: String })
  correlationId?: string;
}

const OrderTransitionSchema = SchemaFactory.createForClass(
  OrderTransitionDataModel,
);

@Schema({ versionKey: false })
export class OrderDataModel extends BaseDocument implements IOrderDataModel {
  @Prop({ type: Types.ObjectId, required: true, ref: 'UserDataModel' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'RestaurantDataModel' })
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

  @Prop({ type: Types.ObjectId, ref: DeliveryPersonDataModel.name })
  deliveryPersonId: Types.ObjectId | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CartDataModel.name })
  @Type(() => CartDataModel)
  cart: CartDataModel;

  @Prop({ type: [OrderTransitionSchema], required: true, default: [] })
  timeline: OrderTransitionDataModel[];
}

export const OrderSchema = SchemaFactory.createForClass(OrderDataModel);

OrderSchema.index({ userId: 1, auditCreatedDateTime: -1 });
OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ status: 1, deliveryPersonId: 1 });
