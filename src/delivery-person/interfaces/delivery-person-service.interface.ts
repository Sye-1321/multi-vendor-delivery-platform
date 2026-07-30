import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { IDeliveryPersonResponse } from './deliveryperson-response.interface';
import {
  CreateDeliveryPersonDTO,
  UpdateDeliveryPersonDTO,
} from '../dtos/delivery-person.dto';
import { DeliveryPerson } from '../delivery-person';

export interface IDeliveryPersonService {
  createSystemWideDeliveryPerson(
    props: CreateDeliveryPersonDTO,
    profileImageFile: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>>;
  createRestaurantDeliveryPerson(
    props: CreateDeliveryPersonDTO,
    profileImageFile: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>>;
  getSystemWideDeliveryPersons(): Promise<Result<IDeliveryPersonResponse[]>>;
  getRestaurantDeliveryPersons(): Promise<Result<IDeliveryPersonResponse[]>>;
  getSystemWideDeliveryPersonById(
    id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>>;
  getRestaurantDeliveryPersonById(
    id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>>;
  updateSystemWideDeliveryPerson(
    id: Types.ObjectId,
    props: UpdateDeliveryPersonDTO,
    profileImageFile?: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>>;
  updateRestaurantDeliveryPerson(
    id: Types.ObjectId,
    props: UpdateDeliveryPersonDTO,
    profileImageFile?: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>>;
  getDeliveryPersonById(id: Types.ObjectId): Promise<DeliveryPerson>;
}
