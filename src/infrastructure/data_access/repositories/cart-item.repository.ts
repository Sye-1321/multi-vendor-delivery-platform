import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import {
  CartItemDataModel,
  CartItemDocument,
} from './schemas/cart-item.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { CartItem } from 'src/cart-item/cartItem';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';

export class CartItemRepository extends GenericDocumentRepository<
  CartItem,
  CartItemDocument
> {
  CartItemMapper: CartItemMapper;
  constructor(
    @InjectModel(CartItemDataModel.name)
    CartItemDataModel: Model<CartItemDocument>,
    @InjectConnection() readonly connection: Connection,
    mapper: CartItemMapper,
  ) {
    super(CartItemDataModel, connection, mapper);
  }
}
