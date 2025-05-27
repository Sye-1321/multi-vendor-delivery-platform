import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';
import { IMenuItemResponse } from 'src/menu-item/interfaces/menu-item-response.interface';

export interface IMenuResponse extends IAudit {
  id: Types.ObjectId;
  name: string;
  image: string;
  restaurantId: Types.ObjectId;
  menuItems: IMenuItemResponse[];
}
