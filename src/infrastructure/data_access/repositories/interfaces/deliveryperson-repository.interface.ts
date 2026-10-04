import { DeliveryPerson } from 'src/delivery-person/delivery-person';
import { DeliveryPersonDataModel } from '../schemas/delivery-person.schema';
import { ClientSession, FilterQuery, Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';
import {
  DeliveryPersonOwnership,
  AvailabilityStatus,
} from 'src/delivery-person/constants/constants';
import { ISavedAddress } from 'src/delivery-person/interfaces/deliveryperson.interface';

export type DeliveryPersonProfileUpdate = {
  name?: string;
  phoneNumber?: string;
  savedAddress?: ISavedAddress;
  profileImage?: string;
  auditModifiedBy: string;
  auditModifiedDateTime: string;
};

export type DeliveryPersonScope =
  | {
      deliveryType: DeliveryPersonOwnership.SYSTEM;
    }
  | {
      deliveryType: DeliveryPersonOwnership.RESTAURANT;
      restaurantId: Types.ObjectId;
    };

export interface IDeliveryPersonRepository
  extends IGenericDocument<DeliveryPerson, DeliveryPersonDataModel> {
  getDeliveryPersonById(id: Types.ObjectId): Promise<Result<DeliveryPerson>>;
  createDeliveryPerson(
    model: DeliveryPersonDataModel,
  ): Promise<Result<DeliveryPerson>>;
  getDeliveryPersons(
    filter: FilterQuery<DeliveryPerson>,
  ): Promise<Result<DeliveryPerson[]>>;
  deleteDeliveryPerson(id: Types.ObjectId): Promise<Result<void>>;
  getDeliveryPersonsByRestaurantId(
    restaurantId: Types.ObjectId,
  ): Promise<Result<DeliveryPerson[]>>;
  updateProfile(
    id: Types.ObjectId,
    update: DeliveryPersonProfileUpdate,
  ): Promise<Result<DeliveryPerson>>;
  getSystemWideDeliveryPersons(): Promise<Result<DeliveryPerson[]>>;
  getDeliveryPersonByIdAndRestaurantId(
    id: Types.ObjectId,
    restaurantId: Types.ObjectId,
  ): Promise<Result<DeliveryPerson>>;
  findByPhoneNumber(phoneNumber: string): Promise<Result<DeliveryPerson>>;
  changeAvailability(
    id: Types.ObjectId,
    expectedStatus: AvailabilityStatus,
    nextStatus: AvailabilityStatus,
    audit: {
      auditModifiedBy: string;
      auditModifiedDateTime: string;
    },
    options?: {
      scope?: DeliveryPersonScope;
      session?: ClientSession;
    },
  ): Promise<Result<DeliveryPerson>>;
}
