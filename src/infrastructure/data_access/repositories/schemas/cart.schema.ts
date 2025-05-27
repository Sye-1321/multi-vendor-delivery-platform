import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, Types } from 'mongoose';
import { ICartDataModel } from '../models/cart-model.interface';
import { CartItemDataModel } from './cart-item.schema';
import { UserDataModel } from './user.schema';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';

export type CartDocument = CartDataModel & Document;
@Schema({ versionKey: false })
export class CartDataModel extends BaseDocument implements ICartDataModel {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  @Type(() => UserDataModel)
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  totalPrice: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId }] })
  @Type(() => CartItemDataModel)
  cartItems: CartItemDataModel[];
}

export const CartSchema = SchemaFactory.createForClass(CartDataModel);
