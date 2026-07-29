import { Types } from 'mongoose';

export interface ICartItemDataModel {
  readonly menuItemId: Types.ObjectId;
  readonly subTotal: number;
  readonly quantity: number;
  readonly customizations?: string;
}
