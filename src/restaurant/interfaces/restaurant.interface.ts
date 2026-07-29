import { Types } from 'mongoose';
import { Company } from 'src/company/company';
import { User } from 'src/user/user';
import { RestaurantStatus } from '../constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Menu } from 'src/menu/menu';
import { RestaurantReview } from 'src/restaurant-review/restaurant-review';

export interface ISavedAddress {
  city: string;
  subCity: string;
}

export interface IRestaurant {
  name: string;
  image: string;
  logo: string;
  phoneNumber: string;
  deliveryPersonAvailability: boolean;
  status: RestaurantStatus;
  openingHours: string;
  closingHours: string;
  savedAddress: ISavedAddress;
  audit: Audit;
  menus?: Menu[];
  description?: string;
  companyId: Types.ObjectId;
  company: Company;
  restaurantAdminId: Types.ObjectId;
  restaurantAdmin: User;
  reviews?: RestaurantReview[];
}
