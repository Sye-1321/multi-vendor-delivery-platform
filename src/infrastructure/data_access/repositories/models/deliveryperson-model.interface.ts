import { Types } from 'mongoose';
import {
  AvailabilityStatus,
  DeliveryPersonOwnership,
  DeliveryPersonStatus,
} from 'src/delivery-person/constants/constants';

export interface ISavedAddress {
  city: string;
  subCity: string;
}

export interface IDeliveryPersonModel {
  readonly profileImage: string;
  readonly name: string;
  readonly phoneNumber: string;
  readonly availabilityStatus: AvailabilityStatus;
  readonly status: DeliveryPersonStatus;
  readonly restaurantId?: Types.ObjectId | null;
  readonly deliveryType: DeliveryPersonOwnership;
  readonly savedAddress: ISavedAddress;
}
