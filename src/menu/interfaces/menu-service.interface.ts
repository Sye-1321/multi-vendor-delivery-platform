import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { IMenuResponse } from './menu-reponse.interface';
import { CreateMenuDTO, UpdateMenuDTO } from '../dtos/menu.dto';

export interface IMenuService {
  createMenu(
    props: CreateMenuDTO,
    image: Express.Multer.File,
  ): Promise<Result<IMenuResponse>>;

  getMenus(): Promise<Result<IMenuResponse[]>>;

  getMenuById(
    id: Types.ObjectId,
  ): Promise<Result<IMenuResponse>>;

  updateMenu(
    props: UpdateMenuDTO,
    id: Types.ObjectId,
    image?: Express.Multer.File,
  ): Promise<Result<IMenuResponse>>;

  deleteMenu(
    id: Types.ObjectId,
  ): Promise<Result<void>>;

  getRestaurantMenus(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IMenuResponse[]>>;

  getRestaurantMenuById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<IMenuResponse>>;

  getMyMenus(): Promise<Result<IMenuResponse[]>>;

  getRestaurantMenuById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<IMenuResponse>>;
}
