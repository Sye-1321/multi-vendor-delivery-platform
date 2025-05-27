import { Types } from 'mongoose';
import { IAudit } from 'src/infrastructure/database/mongoDB/base-document.interface';

export interface IMenuItemResponse extends IAudit {
  id: Types.ObjectId;
  name: string;
  image: string;
  description?: string;
  price: number;
  availability: boolean;
  restaurantId: Types.ObjectId;
}
