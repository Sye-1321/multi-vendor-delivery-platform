import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { SystemReviewDataModel } from '../schemas/system-review.schema';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { SystemReview } from 'src/system-review/system-review';

export interface ISystemReviewRepository extends IGenericDocument<SystemReview, SystemReviewDataModel> {
  createSystemReview(model: SystemReviewDataModel): Promise<Result<SystemReview>>;
  deleteSystemReview(id: Types.ObjectId): Promise<Result<void>>;
  getSystemReviewById(id: Types.ObjectId): Promise<Result<SystemReview>>;
  updateSystemReviewById(id: Types.ObjectId,updateData: Partial<SystemReviewDataModel>): Promise<Result<SystemReview>>;
  getAllSystemReviews(): Promise<Result<SystemReview[]>>;
  getSystemReviewByUserId(userId: Types.ObjectId): Promise<Result<SystemReview>>
}
