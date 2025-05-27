import { Types } from 'mongoose';
import { CartItemDataModel } from '../schemas/cart-item.schema';

export interface ICartDataModel {
  readonly userId: Types.ObjectId;
  readonly totalPrice: number;
  readonly cartItems?: CartItemDataModel[];
}



