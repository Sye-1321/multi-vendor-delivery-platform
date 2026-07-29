import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, Types } from 'mongoose';
import { ICartItemDataModel } from '../models/cart-item.model';
import { MenuItemDataModel } from './menu-item.schema';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';

export type CartItemDocument = CartItemDataModel & Document;

@Schema({ versionKey: 'false' })
export class CartItemDataModel
  extends BaseDocument
  implements ICartItemDataModel
{
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: MenuItemDataModel.name,
    required: true,
  })
  @Type(() => MenuItemDataModel)
  menuItemId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  subTotal: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: false })
  customizations?: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItemDataModel);
