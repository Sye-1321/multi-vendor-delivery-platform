import { ClientSession, Types } from 'mongoose';
import { Restaurant } from 'src/restaurant/restaurant';
import {
  RestaurantDataModel,
  RestaurantDocument,
} from '../schemas/restaurant.schema';
import { Result } from 'src/domain/result/result';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';

export interface IRestaurantRepository
  extends IGenericDocument<Restaurant, RestaurantDocument> {
  getRestaurantByRestaurantAdmin(
    restaurantAdminId: Types.ObjectId,
  ): Promise<Result<Restaurant>>;
  getRestaurantsByCompanyId(
    companyAdminId: Types.ObjectId,
  ): Promise<Result<Restaurant[]>>;
  getRestaurantById(restaurantId: Types.ObjectId): Promise<Result<Restaurant>>;
  existsById(restaurantId: Types.ObjectId): Promise<boolean>;
  isRestaurantAdmin(
    restaurantId: Types.ObjectId,
    restaurantAdminId: Types.ObjectId,
  ): Promise<boolean>;
  createRestaurant(
    restaurantDataModel: Partial<RestaurantDataModel>,
    options?: { session?: ClientSession },
  ): Promise<Result<Restaurant>>;
  updateRestaurant(
    restaurantId: Types.ObjectId,
    update: Partial<Restaurant>,
    options?: { session?: ClientSession },
  ): Promise<Result<Restaurant>>;
  getRestaurantsWithFilters(
    filter?: any,
    pagination?: { limit: number; skip: number },
  ): Promise<Result<Restaurant[]>>;
}
