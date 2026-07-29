import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { IMenuDataModel } from '../models/menu-model.interface';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { MenuItemDataModel } from './menu-item.schema';
import { Type } from 'class-transformer';

export type MenuDocument = MenuDataModel & Document;

@Schema({ versionKey: false })
export class MenuDataModel extends BaseDocument implements IMenuDataModel {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  image: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantDataModel',
    required: true,
  })
  restaurantId: Types.ObjectId;

  @Prop({
    type: [
      { type: mongoose.Schema.Types.ObjectId, ref: MenuItemDataModel.name },
    ],
  })
  @Type(() => MenuItemDataModel)
  menuItems: MenuItemDataModel[];
}

export const MenuSchema = SchemaFactory.createForClass(MenuDataModel);

MenuSchema.index({ restaurantId: 1, name: 1 }, { unique: true });
