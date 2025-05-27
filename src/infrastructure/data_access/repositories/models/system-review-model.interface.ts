import { Types } from 'mongoose';

export interface ISystemReviewModel {
  readonly userId: Types.ObjectId;
  readonly rating: number;
  readonly reviewText: string;
}
