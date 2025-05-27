import { Types } from 'mongoose';
import { ISystemReviewResponse } from './system-review-response.interface';
import { CreateReviewDTO, UpdateReviewDTO } from '../dtos/system-review.dto';
import { Result } from 'src/domain/result/result';

export interface ISystemReviewService {
    createReview(props: CreateReviewDTO): Promise<Result<ISystemReviewResponse>>;
    updateSystemReview(reviewId: Types.ObjectId, props: UpdateReviewDTO): Promise<Result<ISystemReviewResponse>>;
    getAllSystemReviews(): Promise<Result<ISystemReviewResponse[]>>;
    getSystemReviewById(reviewId: Types.ObjectId): Promise<Result<ISystemReviewResponse>>;
    deleteSystemReviewById(reviewId: Types.ObjectId): Promise<Result<void>>;
}
