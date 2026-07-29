import { DeliveryPerson } from 'src/delivery-person/delivery-person';
import { DeliveryPersonDataModel } from '../schemas/delivery-person.schema';
import { FilterQuery, Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';

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
  updateDeliveryPersonById(
    id: Types.ObjectId,
    updateData: Partial<DeliveryPersonDataModel>,
  ): Promise<Result<DeliveryPerson>>;
  getSystemWideDeliveryPersons(): Promise<Result<DeliveryPerson[]>>;
  getDeliveryPersonByIdAndRestaurantId(
    id: Types.ObjectId,
    restaurantId: Types.ObjectId,
  ): Promise<Result<DeliveryPerson>>;
  findByPhoneNumber(phoneNumber: string): Promise<Result<DeliveryPerson>>;
}
