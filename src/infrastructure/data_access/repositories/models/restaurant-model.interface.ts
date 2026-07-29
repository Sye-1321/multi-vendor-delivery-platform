import { Types } from 'mongoose';
import { PaymentMethod, RestaurantStatus } from 'src/restaurant/constants/constants';
import { ISavedAddress } from './deliveryperson-model.interface';

export interface IRestaurantDataModel {
  readonly name: string;
  readonly description?: string;
  readonly savedAddress: ISavedAddress;
  readonly phoneNumber: string;
  readonly companyId: Types.ObjectId;
  readonly deliveryPersonAvailability: boolean;
  readonly restaurantAdminId: Types.ObjectId;
  readonly status: RestaurantStatus;
  readonly openingHours: string;
  readonly closingHours: string;
  readonly image: string;
  readonly logo: string;
}

