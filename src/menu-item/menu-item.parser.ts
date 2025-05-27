import { MenuItem } from './menu-item';
import { IMenuItemResponse } from './interfaces/menu-item-response.interface';
import { AuditParser } from 'src/audit/audit.parser';

export class MenuItemParser {
  static createMenuItemResponse(menuItem: MenuItem): IMenuItemResponse {
    const IMenuItemResponse: IMenuItemResponse = {
      id: menuItem.id,
      name: menuItem.name,
      image: menuItem.image,
      restaurantId: menuItem.restaurantId,
      description: menuItem.description,
      price: menuItem.price,
      availability: menuItem.availability,
      ...AuditParser.createAuditResponse(menuItem.audit),
    };
    return IMenuItemResponse;
  }

  static createMenuItemsResponse(menuItems: MenuItem[]): IMenuItemResponse[] {
    return menuItems.map((item) => MenuItemParser.createMenuItemResponse(item));
  }
}
