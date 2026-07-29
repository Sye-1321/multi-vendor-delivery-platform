import { Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { MenuItem } from 'src/menu-item/menu-item';
import {
  MenuItemDataModel,
  MenuItemDocument,
} from '../schemas/menu-item.schema';
import { Result } from 'src/domain/result/result';

export interface IMenuItemRepository
  extends IGenericDocument<MenuItem, MenuItemDocument> {
  getMenuItemById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<MenuItem>>;
  findMenuItemByName(
    restaurantId: Types.ObjectId,
    name: string,
  ): Promise<Result<MenuItem>>;
  createMenuItem(menuItemModel: MenuItemDataModel): Promise<Result<MenuItem>>;
  deleteMenuItem(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<void>>;
  getMenuItems(restaurantId: Types.ObjectId): Promise<Result<MenuItem[]>>;
  updateMenuItemById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
    updateData: Partial<MenuItemDataModel>,
  ): Promise<Result<MenuItem>>;
  getMenuItemsByIds(itemIds: Types.ObjectId[]): Promise<Result<MenuItem[]>>;
}
