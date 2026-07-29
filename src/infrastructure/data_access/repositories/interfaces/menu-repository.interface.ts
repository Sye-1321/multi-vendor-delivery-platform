import { Menu } from 'src/menu/menu';
import { MenuDataModel, MenuDocument } from '../schemas/menu.schema';
import { Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';

export interface IMenuRepository extends IGenericDocument<Menu, MenuDocument> {
  getMenuById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<Menu>>;
  findMenuByName(
    restaurantId: Types.ObjectId,
    name: string,
  ): Promise<Result<Menu>>;
  createMenu(menuData: MenuDataModel): Promise<Result<Menu>>;
  deleteMenu(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<void>>;
  getMenusByRestaurantId(restaurantId: Types.ObjectId): Promise<Result<Menu[]>>;
  updateMenuById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
    updateData: Partial<MenuDataModel>,
  ): Promise<Result<Menu>>;
}
