import { Types } from 'mongoose';
import { CartDataModel } from '../schemas/cart.schema';
import { OrderStatus, PaymentStatus } from 'src/order/constants/constants';

export interface IOrderDataModel {
  readonly userId: Types.ObjectId;
  readonly restaurantId: Types.ObjectId;
  readonly cart: CartDataModel;
  readonly deliveryAddress: {
    city: string;
    subCity: string;
  };
  readonly status: OrderStatus;
  readonly totalPrice: number;
  readonly paymentStatus: PaymentStatus;
  readonly deliveryPersonId: Types.ObjectId | null;
}
