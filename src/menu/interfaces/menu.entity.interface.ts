import { Types } from 'mongoose';
import { Audit } from 'src/domain/audit/audit';
import { MenuItem } from 'src/menu-item/menu-item';

export interface IMenu {
  name: string;
  image: string;
  restaurantId: Types.ObjectId;
  menuItems: MenuItem[];
  audit: Audit;
}
