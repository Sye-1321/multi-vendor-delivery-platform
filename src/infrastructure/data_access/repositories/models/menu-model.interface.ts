import { Types } from 'mongoose';
import { MenuItemDataModel } from '../schemas/menu-item.schema';

export interface IMenuDataModel {
  readonly name: string;
  readonly image: string;
  readonly restaurantId: Types.ObjectId;
  readonly menuItems: MenuItemDataModel[];
}

export interface IMenuDataModelWithDetails extends IMenuDataModel {
  readonly itemDetails: MenuItemDataModel[];
  readonly _id: Types.ObjectId;
}
