import { Types } from 'mongoose';
import { IRestaurantResponse } from './restuarant-response.interface';
import { Restaurant } from '../restuarant';
import {
  CreateRestaurantDTO,
  RestaurantAdminDTO,
  UpdateRestaurantDTO,
} from '../dtos/create-restaurant.dto';
import { Result } from 'src/domain/result/result';

export interface IRestaurantService {
  createRestaurant(
  data: CreateRestaurantDTO,
  logoFile: Express.Multer.File,
  coverImageFile: Express.Multer.File
): Promise<Result<IRestaurantResponse>>

  getRestaurants(): Promise<Result<IRestaurantResponse[]>>;

  getRestaurantById(restaurantId: Types.ObjectId): Promise<Result<IRestaurantResponse>>;

  updateRestaurant(
    restaurantId: Types.ObjectId,
    updateData: UpdateRestaurantDTO,
    logo?: Express.Multer.File,
    coverImage?: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>>;

  updateMyRestaurant(
    restaurantData: UpdateRestaurantDTO,
    logoFile?: Express.Multer.File,
    coverImageFile?: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>>;

  changeRestaurantAdmin(
    restaurantId: Types.ObjectId,
    restaurantAdminData: RestaurantAdminDTO,
  ): Promise<Result<IRestaurantResponse>>;

  getRestaurantsByCompany(): Promise<Result<IRestaurantResponse[]>>;

  getCompanyRestaurantById(restaurantId: Types.ObjectId): Promise<Result<IRestaurantResponse>>;

  getRestaurantByRestaurantAdmin(): Promise<Result<IRestaurantResponse>>;

  getRestaurantByRAdmin(): Promise<Restaurant>;

}
