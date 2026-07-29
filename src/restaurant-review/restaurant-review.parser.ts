import { UserParser } from 'src/user/user.parser';
import { IRestaurantReviewResponse } from './interfaces/restaurant-review-response.interface';
import { RestaurantReview } from './restaurant-review';
import { AuditParser } from 'src/audit/audit.parser';

export class RestaurantReviewParser {
  static createReviewResponse(
    review: RestaurantReview,
  ): IRestaurantReviewResponse {
    const reviewResponse: IRestaurantReviewResponse = {
      id: review.id,
      user: UserParser.createUserResponse(review.user),
      rating: review.rating,
      reviewText: review.reviewText,
      ...AuditParser.createAuditResponse(review.audit),
    };
    return reviewResponse;
  }

  static createReviewsResponse(
    reviews: RestaurantReview[],
  ): IRestaurantReviewResponse[] {
    return reviews.map((review) =>
      RestaurantReviewParser.createReviewResponse(review),
    );
  }
}
