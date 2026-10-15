import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Cart } from 'src/cart/cart';
import { CartDataModel, CartDocument } from './schemas/cart.schema';
import { CartMapper } from 'src/cart/cart.mapper';
import { ICartRepository } from './interfaces/cart.repository';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';

@Injectable()
export class CartRepository
  extends GenericDocumentRepository<Cart, CartDocument>
  implements ICartRepository
{
  constructor(
    @InjectModel(CartDataModel.name) cartDataModel: Model<CartDocument>,
    @InjectConnection() readonly connection: Connection,
    mapper: CartMapper,
  ) {
    super(cartDataModel, connection, mapper);
  }
}
