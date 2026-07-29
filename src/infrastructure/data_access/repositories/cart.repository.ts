import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Cart } from 'src/cart/cart';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';
import { CartDataModel, CartDocument } from './schemas/cart.schema';
import { CartMapper } from 'src/cart/cart.mapper';
import { ICartRepository } from './interfaces/cart.repository';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';

@Injectable()
export class CartRepository
  extends GenericDocumentRepository<Cart, CartDocument>
  implements ICartRepository
{
  cartMapper: CartMapper;
  constructor(
    @InjectModel(CartDataModel.name) cartDataModel: Model<CartDocument>,
    @InjectConnection() readonly connection: Connection,
    mapper: CartMapper,
  ) {
    super(cartDataModel, connection, mapper);
  }

  async updateCartItemSelectedItems(
    cartItems: Cart[],
  ): Promise<Result<Cart[]>> {
    const document = cartItems.map((doc) => this.cartMapper.toPersistence(doc));
    const selectedItemsToUpdate = document.map((doc) => ({
      _id: doc._id,
      cartItems: doc.cartItems,
    }));
    const result = await this.updateMany(
      { _id: { $in: document.map((doc) => doc._id) } },
      {
        $set: {
          cartItems: selectedItemsToUpdate.map((item) => item.cartItems),
        },
      },
    );
    if (!result.isSuccess) {
      throwApplicationError(HttpStatus.BAD_REQUEST, '');
    }
    return result;
  }
}
