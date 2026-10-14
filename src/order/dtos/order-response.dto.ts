import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import { OrderStatus, PaymentStatus } from '../constants/constants';
import { IDeliveryPersonResponse } from 'src/delivery-person/interfaces/deliveryperson-response.interface';
import { ISavedAddress } from '../interfaces/order.interface';
import { Role } from 'src/application/constants/constants';

export interface IOrderTimelineEntryDTO {
  from: OrderStatus | null;
  to: OrderStatus;
  actorRole: Role;
  occurredAt: string;
  reason?: string;
}

export interface IOrderLineItemDTO {
  id: Types.ObjectId;
  menuItemId: Types.ObjectId;
  quantity: number;
  subTotal: number;
  customizations?: string;
}

export interface IOrderCartDTO {
  id: Types.ObjectId;
  totalPrice: number;
  cartItems: IOrderLineItemDTO[];
}

export interface IOrderResponseDTO extends IAudit {
  id: Types.ObjectId;
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  cart: IOrderCartDTO;
  deliveryAddress: ISavedAddress;
  status: OrderStatus;
  deliveryPersonId: Types.ObjectId | null;
  deliveryPerson: IDeliveryPersonResponse | null;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  timeline: IOrderTimelineEntryDTO[];
}
