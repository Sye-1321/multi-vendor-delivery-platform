import { Cart } from 'src/cart/cart';
import { CartDocument } from '../schemas/cart.schema';
import { ClientSession } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';

export interface ICartRepository extends IGenericDocument<Cart, CartDocument> {
  updateCartItemSelectedItems(
    cartItems: Cart[],
    options?: { session: ClientSession },
  ): Promise<Result<Cart[]>>;
}
