import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { UserStatus } from './constants/constants';
import { UserService } from './user.service';

describe('UserService update failures', () => {
  const userId = new Types.ObjectId();
  const user = {
    id: userId,
    role: Role.END_USER,
    status: UserStatus.ACTIVE,
  };

  function build() {
    const repository = {
      getUserById: jest.fn().mockResolvedValue(Result.ok(user)),
      updateUser: jest
        .fn()
        .mockResolvedValue(Result.fail('User not found', HttpStatus.NOT_FOUND)),
    };
    const accessRevocations = { publish: jest.fn() };
    const service = new UserService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { getContext: () => ({ email: 'admin@example.com' }) } as never,
      repository as never,
      accessRevocations as never,
    );
    return { service, accessRevocations };
  }

  it('returns 404 when an administrator update no longer matches a user', async () => {
    const { service, accessRevocations } = build();

    await expect(
      service.adminUpdateUser(userId, { status: UserStatus.SUSPENDED }),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    expect(accessRevocations.publish).not.toHaveBeenCalled();
  });

  it('returns 404 when account suspension no longer matches a user', async () => {
    const { service, accessRevocations } = build();

    await expect(service.suspendUser(userId)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    expect(accessRevocations.publish).not.toHaveBeenCalled();
  });
});
