import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { IMenuItemDataModel } from '../models/menu-item.interface';

export type MenuItemDocument = MenuItemDataModel & Document;

@Schema({ versionKey: false })
export class MenuItemDataModel extends BaseDocument implements IMenuItemDataModel {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' })
  restaurantId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  availability: boolean;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItemDataModel);

