import { AuditParser } from 'src/audit/audit.parser';
import { Menu } from './menu';
import { MenuItemParser } from 'src/menu-item/menu-item.parser'; 
import { IMenuItemResponse } from 'src/menu-item/interfaces/menu-item-response.interface';
import { IMenuResponse } from './interfaces/menu-reponse.interface';

export class MenuParser {
  static createMenuResponse(menu: Menu): IMenuResponse {
    let menuItemsResponse: IMenuItemResponse[] = [];

    if (menu.menuItems?.length) {
      menuItemsResponse = MenuItemParser.createMenuItemsResponse(menu.menuItems);
    }

    const menuResponse: IMenuResponse = {
      id: menu.id,
      name: menu.name,
      image: menu.image,
      restaurantId: menu.restaurantId,
      menuItems: menuItemsResponse,
      ...AuditParser.createAuditResponse(menu.audit),
    };

    return menuResponse;
  }

  static createMenusResponse(menus: Menu[]): IMenuResponse[] {
    return menus.map((menu) => MenuParser.createMenuResponse(menu));
  }
}
