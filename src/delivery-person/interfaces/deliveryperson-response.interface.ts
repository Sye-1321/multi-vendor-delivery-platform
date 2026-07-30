import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import {
  AvailabilityStatus,
  DeliveryPersonOwnership,
  DeliveryPersonStatus,
} from '../constants/constants';

export interface ISavedAddress {
  city: string;
  subCity: string;
}

export interface IDeliveryPersonResponse extends IAudit {
  id: Types.ObjectId;
  profileImage: string;
  name: string;
  phoneNumber: string;
  availabilityStatus: AvailabilityStatus;
  status: DeliveryPersonStatus;
  delivery_type: DeliveryPersonOwnership;
  restaurantId?: Types.ObjectId;
  savedAddress: ISavedAddress;
}
