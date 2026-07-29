import { Injectable } from '@nestjs/common';
import { Menu } from './menu';
import { MenuDataModel } from 'src/infrastructure/data_access/repositories/schemas/menu.schema';
import { IMapper } from '../domain/mapper/mapper';
import { AuditMapper } from '../audit/audit.mapper';
import { MenuItemMapper } from '../menu-item/menu-item.mapper';
import { MenuItem } from 'src/menu-item/menu-item';
import { MenuItemDataModel } from 'src/infrastructure/data_access/repositories/schemas/menu-item.schema';

@Injectable()
export class MenuMapper implements IMapper<Menu, MenuDataModel> {
  constructor(
    private readonly auditMapper: AuditMapper,
    private readonly menuItemMapper: MenuItemMapper,
  ) {}

  toPersistence(entity: Menu): MenuDataModel {
    const { id, name, image, restaurantId, menuItems, audit } = entity;

    const {
      auditCreatedBy,
      auditCreatedDateTime,
      auditModifiedBy,
      auditModifiedDateTime,
      auditDeletedBy,
      auditDeletedDateTime,
    } = audit;

    const document: MenuDataModel = {
      _id: id,
      name,
      image,
      restaurantId,
      menuItems:
        menuItems?.map((item) => this.menuItemMapper.toPersistence(item)) ?? [],
      auditCreatedBy,
      auditCreatedDateTime,
      auditModifiedBy,
      auditModifiedDateTime,
      auditDeletedBy,
      auditDeletedDateTime,
    };

    return document;
  }

  toDomain(doc: MenuDataModel): Menu {
    const { _id, name, image, restaurantId, menuItems } = doc;

    const menuItemsToDomain: MenuItem[] =
      menuItems?.map((item) =>
        this.menuItemMapper.toDomain(item as MenuItemDataModel),
      ) ?? [];

    const entity: Menu = Menu.create(
      {
        name,
        image,
        restaurantId,
        menuItems: menuItemsToDomain,
        audit: this.auditMapper.toDomain(doc),
      },
      _id,
    ).getValue();

    return entity;
  }
}
