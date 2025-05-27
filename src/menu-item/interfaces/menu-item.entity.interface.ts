import { Types } from "mongoose";
import { Audit } from "src/domain/audit/audit";

export interface IMenuItem {
  name: string;
  restaurantId: Types.ObjectId;
  image: string;
  price: number;
  availability: boolean;
  description?: string;
  audit: Audit;
}
