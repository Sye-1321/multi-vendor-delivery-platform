import { Cart } from 'src/cart/cart';
import { CartDocument } from '../schemas/cart.schema';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';

export type ICartRepository = IGenericDocument<Cart, CartDocument>;
