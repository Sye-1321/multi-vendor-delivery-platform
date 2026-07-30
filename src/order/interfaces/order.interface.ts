import { Types } from 'mongoose';
import { Cart } from 'src/cart/cart';
import { OrderStatus, PaymentStatus } from '../constants/constants';
import { DeliveryPerson } from 'src/delivery-person/delivery-person';
import { Audit } from 'src/domain/audit/audit';
import { Role } from 'src/application/constants/constants';

export interface ISavedAddress {
  city: string;
  subCity: string;
}

export interface IOrderTransition {
  from: OrderStatus | null;
  to: OrderStatus;
  actorId: Types.ObjectId;
  actorRole: Role;
  occurredAt: string;
  correlationId?: string;
  reason?: string;
}

export interface IOrder {
  userId: Types.ObjectId;
  cart: Cart;
  restaurantId: Types.ObjectId;
  deliveryAddress: ISavedAddress;
  status: OrderStatus;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  deliveryPerson?: DeliveryPerson | null;
  deliveryPersonId?: Types.ObjectId | null;
  timeline?: IOrderTransition[];
  audit: Audit;
}
