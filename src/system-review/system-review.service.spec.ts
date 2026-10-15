import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { SystemReviewService } from './system-review.service';

describe('SystemReviewService update failures', () => {
  it('returns the repository 404 when the review disappears during update', async () => {
    const userId = new Types.ObjectId();
    const repository = {
      getSystemReviewById: jest.fn().mockResolvedValue(Result.ok({ userId })),
      updateSystemReviewById: jest
        .fn()
        .mockResolvedValue(
          Result.fail('Review not found', HttpStatus.NOT_FOUND),
        ),
    };
    const service = new SystemReviewService(
      { getContext: () => ({ email: 'user@example.com' }) } as never,
      { getContextUser: () => Promise.resolve({ id: userId }) } as never,
      repository as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateSystemReview(new Types.ObjectId(), { rating: 4 }),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });
});
