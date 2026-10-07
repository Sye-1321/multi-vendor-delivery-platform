import { UserParser } from 'src/user/user.parser';
import {
  IPublicSystemReviewResponse,
  ISystemReviewResponse,
} from './interfaces/system-review-response.interface';
import { SystemReview } from './system-review';
import { AuditParser } from 'src/audit/audit.parser';

export class SystemReviewParser {
  static createPublicSystemReviewResponse(
    review: SystemReview,
  ): IPublicSystemReviewResponse {
    return {
      id: review.id,
      user: UserParser.createPublicUserResponse(review.user),
      rating: review.rating,
      reviewText: review.reviewText,
      ...AuditParser.createAuditResponse(review.audit),
    };
  }

  static createPublicSystemReviewsResponse(
    reviews: SystemReview[],
  ): IPublicSystemReviewResponse[] {
    return reviews.map((review) =>
      SystemReviewParser.createPublicSystemReviewResponse(review),
    );
  }

  static createSystemReviewResponse(
    review: SystemReview,
  ): ISystemReviewResponse {
    const reviewResponse: ISystemReviewResponse = {
      id: review.id,
      user: UserParser.createUserResponse(review.user),
      rating: review.rating,
      reviewText: review.reviewText,
      ...AuditParser.createAuditResponse(review.audit),
    };
    return reviewResponse;
  }

  static createSystemReviewsResponse(
    reviews: SystemReview[],
  ): ISystemReviewResponse[] {
    return reviews.map((review) =>
      SystemReviewParser.createSystemReviewResponse(review),
    );
  }
}
