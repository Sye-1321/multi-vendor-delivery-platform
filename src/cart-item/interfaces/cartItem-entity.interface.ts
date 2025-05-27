import { Types } from 'mongoose';
import { Audit } from 'src/domain/audit/audit';

export interface ICartItem {
  menuItemId: Types.ObjectId;
  quantity: number;
  subTotal: number;
  customizations?: string; 
  audit: Audit;
}
