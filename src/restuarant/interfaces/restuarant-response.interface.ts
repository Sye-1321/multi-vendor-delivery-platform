import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import { IUserResponse } from 'src/user/interfaces/user-response.interface';
import { RestaurantStatus } from '../constants/constants';
import { IMenuResponse } from 'src/menu/interfaces/menu-reponse.interface';
import { IRestaurantReviewResponse } from 'src/restuarant-review/interfaces/restaurant-review-response.interface';

export interface ISavedAddress{
  city: string,
  subCity: string
}

export interface IRestaurantResponse extends IAudit {
  id: Types.ObjectId;
  name: string;
  image: string;
  logo: string;
  phoneNumber: string;
  deliveryPersonAvailability: boolean;
  status: RestaurantStatus;
  openingHours: string;
  closingHours: string;
  savedAddress: ISavedAddress;
  restaurantAdmin: IUserResponse;
  reviews: IRestaurantReviewResponse[];
  menus: IMenuResponse[];
  description?: string;
}
