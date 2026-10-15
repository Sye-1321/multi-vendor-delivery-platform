import { HttpStatus } from '@nestjs/common';
import { UserRepository } from './user.repository';

describe('UserRepository update failures', () => {
  it('classifies a findOneAndUpdate no-match as not found', async () => {
    const model = {
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
    };
    const repository = new UserRepository(
      model as never,
      {} as never,
      {} as never,
    );

    const result = await repository.updateUser({}, {});

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe(HttpStatus.NOT_FOUND);
  });
});
