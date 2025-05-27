import { Types } from 'mongoose';
import { AvailabilityStatus, DeliveryPersonOwnership, DeliveryPersonStatus } from '../constants/constants';
import { Audit } from 'src/domain/audit/audit';

export interface ISavedAddress{
  city: string,
  subCity: string
}

export interface IDeliveryPerson {
  profileImage: string;
  name: string;
  phoneNumber: string;
  availabilityStatus: AvailabilityStatus;
  status: DeliveryPersonStatus;
  deliveryType: DeliveryPersonOwnership,
  restaurantId?: Types.ObjectId,
  savedAddress: ISavedAddress,
  audit: Audit;
}

