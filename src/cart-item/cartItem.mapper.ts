import { Injectable } from '@nestjs/common';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { CartItemDataModel } from 'src/infrastructure/data_access/repositories/schemas/cart-item.schema';
import { CartItem } from './cartItem';

@Injectable()
export class CartItemMapper implements IMapper<CartItem, CartItemDataModel> {
  constructor(private readonly auditMapper: AuditMapper) {}

  toPersistence(entity: CartItem): CartItemDataModel {
    const { id, menuItemId, quantity, subTotal, customizations, audit } =
      entity;
    const {
      auditCreatedBy,
      auditCreatedDateTime,
      auditDeletedBy,
      auditDeletedDateTime,
      auditModifiedBy,
      auditModifiedDateTime,
    } = audit;

    const document: CartItemDataModel = {
      _id: id,
      menuItemId,
      quantity,
      subTotal,
      ...(customizations && { customizations }),
      auditCreatedBy,
      auditCreatedDateTime,
      auditDeletedBy,
      auditDeletedDateTime,
      auditModifiedBy,
      auditModifiedDateTime,
    };

    return document;
  }

  toDomain(document: CartItemDataModel): CartItem {
    const { _id, menuItemId, quantity, subTotal, customizations } = document;
    const entity: CartItem = CartItem.create(
      {
        menuItemId,
        quantity,
        subTotal,
        customizations,
        audit: this.auditMapper.toDomain(document),
      },
      _id,
    ).getValue();

    return entity;
  }
}
