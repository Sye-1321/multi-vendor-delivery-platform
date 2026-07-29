import { Injectable } from '@nestjs/common';
import { MenuItemDataModel } from '../infrastructure/data_access/repositories/schemas/menu-item.schema';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { MenuItem } from './menu-item';

@Injectable()
export class MenuItemMapper implements IMapper<MenuItem, MenuItemDataModel> {
  constructor(private readonly auditMapper: AuditMapper) {}

  toPersistence(entity: MenuItem): MenuItemDataModel {
    const document: MenuItemDataModel = {
      _id: entity.id,
      name: entity.name,
      restaurantId: entity.restaurantId,
      image: entity.image,
      description: entity.description,
      price: entity.price,
      availability: entity.availability,
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditModifiedBy: entity.audit.auditModifiedBy,
      auditModifiedDateTime: entity.audit.auditModifiedDateTime,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
      auditDeletedBy: entity.audit.auditDeletedBy,
    };
    return document;
  }

  toDomain(doc: MenuItemDataModel): MenuItem {
    const { _id, name, image, description, price, availability, restaurantId } =
      doc;
    const entity: MenuItem = MenuItem.create(
      {
        name,
        restaurantId,
        image,
        description,
        price,
        availability,
        audit: this.auditMapper.toDomain(doc),
      },
      _id,
    ).getValue();
    return entity;
  }
}
