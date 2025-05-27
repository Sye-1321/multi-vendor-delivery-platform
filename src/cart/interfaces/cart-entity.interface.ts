import { Types } from 'mongoose';
import { CartItem } from 'src/cart-item/cartItem';
import { Audit } from 'src/domain/audit/audit';

export interface ICart {
  userId: Types.ObjectId;
  totalPrice: number;
  cartItems?: CartItem[];
  audit: Audit;
}
