import { Types } from 'mongoose';
import {
  IPublicRestaurantResponse,
  IRestaurantResponse,
} from './restaurant-response.interface';
import { Restaurant } from '../restaurant';
import {
  CreateRestaurantDTO,
  RestaurantAdminDTO,
  UpdateRestaurantDTO,
} from '../dtos/create-restaurant.dto';
import { Result } from 'src/domain/result/result';
import { PaginationOptions } from 'src/shared/interfaces/shared.interface';

export interface IRestaurantService {
  createRestaurant(
    data: CreateRestaurantDTO,
    logoFile: Express.Multer.File,
    coverImageFile: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>>;

  getRestaurants(
    pagination: PaginationOptions,
  ): Promise<Result<IPublicRestaurantResponse[]>>;

  getRestaurantById(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IPublicRestaurantResponse>>;

  updateMyRestaurant(
    restaurantData: UpdateRestaurantDTO,
    logoFile?: Express.Multer.File,
    coverImageFile?: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>>;

  changeRestaurantAdmin(
    restaurantId: Types.ObjectId,
    restaurantAdminData: RestaurantAdminDTO,
  ): Promise<Result<IRestaurantResponse>>;

  getRestaurantsByCompany(
    pagination: PaginationOptions,
  ): Promise<Result<IRestaurantResponse[]>>;

  getCompanyRestaurantById(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IRestaurantResponse>>;

  getRestaurantByRestaurantAdmin(): Promise<Result<IRestaurantResponse>>;

  getRestaurantByRAdmin(): Promise<Restaurant>;
}
