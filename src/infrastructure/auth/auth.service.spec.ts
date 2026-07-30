import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { UserStatus } from 'src/user/constants/constants';
import { AuthService } from './auth.service';

describe('AuthService refresh rotation', () => {
  it('rotates both tokens and revokes the session when the old token is reused', async () => {
    const userId = new Types.ObjectId();
    let storedHash: string | null = await bcrypt.hash('initial-refresh', 4);
    const repository = {
      findById: jest.fn().mockImplementation(() =>
        Promise.resolve(
          Result.ok({
            id: userId,
            email: 'user@example.com',
            role: Role.END_USER,
            status: UserStatus.ACTIVE,
            refreshTokenHash: storedHash,
          }),
        ),
      ),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation(
          (_filter: unknown, update: { refreshTokenHash: string | null }) => {
            storedHash = update.refreshTokenHash;
            return Promise.resolve(Result.ok(undefined));
          },
        ),
    };
    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('rotated-access')
        .mockResolvedValueOnce('rotated-refresh'),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key.includes('EXPIRATION') ? '15m' : 'a'.repeat(32),
      ),
    };
    const service = new AuthService(
      jwtService as never,
      configService as never,
    );

    await expect(
      service.updateRefreshToken(
        repository as never,
        userId,
        'initial-refresh',
      ),
    ).resolves.toEqual({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
    });
    expect(await bcrypt.compare('rotated-refresh', storedHash!)).toBe(true);

    await expect(
      service.updateRefreshToken(
        repository as never,
        userId,
        'initial-refresh',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(storedHash).toBeNull();
  });
});
