import { UserParser } from "src/user/user.parser";
import { ISystemReviewResponse } from "./interfaces/system-review-response.interface";
import { SystemReview } from "./system-review";
import { AuditParser } from "src/audit/audit.parser";

export class SystemReviewParser {
  static createSystemReviewResponse(review: SystemReview): ISystemReviewResponse {
    const reviewResponse: ISystemReviewResponse = {
      id: review.id,
      user: UserParser.createUserResponse(review.user),
      rating: review.rating,
      reviewText: review.reviewText,
      ...AuditParser.createAuditResponse(review.audit),
    };
    return reviewResponse;
  }

  static createSystemReviewsResponse(reviews: SystemReview[]): ISystemReviewResponse[] {
    return reviews.map((review) => SystemReviewParser.createSystemReviewResponse(review));
  }
}
