import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { RestaurantReviewService } from './restaurant-review.service';

describe('RestaurantReviewService update failures', () => {
  it('returns the repository 404 when the review disappears during update', async () => {
    const userId = new Types.ObjectId();
    const reviewId = new Types.ObjectId();
    const repository = {
      getRestaurantReviewById: jest
        .fn()
        .mockResolvedValue(Result.ok({ id: reviewId, userId })),
      updateRestaurantReviewById: jest
        .fn()
        .mockResolvedValue(
          Result.fail('Review not found', HttpStatus.NOT_FOUND),
        ),
    };
    const service = new RestaurantReviewService(
      { getContext: () => ({ email: 'user@example.com' }) } as never,
      { getContextUser: () => Promise.resolve({ id: userId }) } as never,
      repository as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateRestaurantReview(reviewId, { rating: 4 }),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });
});
