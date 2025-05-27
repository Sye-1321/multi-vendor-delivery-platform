import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import { OrderStatus, PaymentStatus } from '../constants/constants';
import { IDeliveryPersonResponse } from 'src/delivery-person/interfaces/deliveryperson-response.interface';
import { ISavedAddress } from '../interfaces/order.interface';


export interface IOrderResponseDTO extends IAudit{
  id: Types.ObjectId;
  userId: Types.ObjectId,
  restaurantId: Types.ObjectId,
  deliveryAddress: ISavedAddress,
  status: OrderStatus,
  deliveryPerson:IDeliveryPersonResponse | null,
  paymentStatus: PaymentStatus,
  totalPrice: number,
}


