import { Types } from 'mongoose';
import { IMenuItemResponse } from './menu-item-response.interface';
import { Result } from 'src/domain/result/result';
import {
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
} from '../dtos/create-menu-item.dto';
import { MenuItem } from '../menu-item';

export interface IMenuItemService {
  createMenuItem(
    props: CreateMenuItemDTO,
    image?: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>>;

  getMenuItems(): Promise<Result<IMenuItemResponse[]>>;

  getMenuItemById(id: Types.ObjectId): Promise<Result<IMenuItemResponse>>;

  updateMenuItem(
    id: Types.ObjectId,
    props: UpdateMenuItemDTO,
    imageFile?: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>>;

  deleteMenuItem(id: Types.ObjectId): Promise<Result<void>>;

  getRestaurantMenuItems(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse[]>>;

  getRestaurantMenuItemById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>>;

  getMenuItemsByIds(itemIds: Types.ObjectId[]): Promise<MenuItem[]>;
}
