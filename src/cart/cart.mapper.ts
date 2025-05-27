import { Injectable } from '@nestjs/common';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { Cart } from './cart';
import { CartDataModel } from 'src/infrastructure/data_access/repositories/schemas/cart.schema';
import { CartItemDataModel } from 'src/infrastructure/data_access/repositories/schemas/cart-item.schema';
import { CartItem } from 'src/cart-item/cartItem';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';

@Injectable()
export class CartMapper implements IMapper<Cart, CartDataModel> {
  constructor(
    private readonly auditMapper: AuditMapper, 
    private readonly cartItemMapper: CartItemMapper
) {}

    toPersistence(entity: Cart): CartDataModel {
        const { id, totalPrice, cartItems, audit, userId } = entity;
        const {
          auditCreatedBy,
          auditCreatedDateTime,
          auditDeletedBy,
          auditDeletedDateTime,
          auditModifiedBy,
          auditModifiedDateTime
        } = audit;
        let itemsToPersistence: CartItemDataModel[] = [];
                  if (cartItems?.length) {
                    itemsToPersistence = cartItems.map((item) => this.cartItemMapper.toPersistence(item));
                  }

        
        const document: CartDataModel = {
          _id: id,
          userId,
          totalPrice,
          cartItems: itemsToPersistence,
          auditCreatedBy,
          auditCreatedDateTime,
          auditDeletedBy,
          auditDeletedDateTime,
          auditModifiedBy,
          auditModifiedDateTime
        };
      
        return document;
      }

      
  toDomain(document: CartDataModel): Cart {
    const { _id, cartItems, totalPrice, userId  } = document;
    let itemsToDomain: CartItem[] = [];
    if (Array.isArray(cartItems) && cartItems.length > 0) {
    itemsToDomain = cartItems.map((item) => this.cartItemMapper.toDomain(item));
    }

    const entity: Cart = Cart.create({
        userId,
        cartItems:  itemsToDomain, 
        totalPrice,
        audit: this.auditMapper.toDomain(document)
    }, 
        _id).getValue();

    return entity;
}
}