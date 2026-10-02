import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { UserStatus } from 'src/user/constants/constants';
import { AuthService } from './auth.service';

const hashRefreshToken = (refreshToken: string): string =>
  createHash('sha256').update(refreshToken, 'utf8').digest('hex');

describe('AuthService refresh rotation', () => {
  it('rejects replay of a real JWT after rotation and leaves the replacement valid', async () => {
    const userId = new Types.ObjectId();
    const jwtService = new JwtService();
    const config = {
      JWT_ACCESS_TOKEN_SECRET: 'access-secret-for-tests',
      JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
      JWT_REFRESH_TOKEN_SECRET: 'refresh-secret-for-tests',
      JWT_REFRESH_TOKEN_EXPIRATION_TIME: '1d',
    };
    const configService = {
      get: jest.fn((key: keyof typeof config) => config[key]),
    };
    const service = new AuthService(
      jwtService,
      configService as unknown as ConfigService,
    );
    const initialTokens = await service.generateAuthTokens({
      userId,
      email: 'user@example.com',
      role: Role.END_USER,
    });
    let storedHash: string | null = hashRefreshToken(
      initialTokens.refreshToken,
    );
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
          (
            filter: { refreshTokenHash?: string },
            update: { refreshTokenHash: string | null },
          ) => {
            if (
              filter.refreshTokenHash !== undefined &&
              filter.refreshTokenHash !== storedHash
            ) {
              return Promise.resolve(
                Result.fail('Conditional update did not match', 500),
              );
            }
            storedHash = update.refreshTokenHash;
            return Promise.resolve(Result.ok(undefined));
          },
        ),
    };

    const rotatedTokens = await service.updateRefreshToken(
      repository as never,
      userId,
      initialTokens.refreshToken,
    );
    expect(rotatedTokens.refreshToken).not.toBe(initialTokens.refreshToken);
    expect(rotatedTokens.refreshToken.slice(0, 72)).toBe(
      initialTokens.refreshToken.slice(0, 72),
    );
    expect(storedHash).toBe(hashRefreshToken(rotatedTokens.refreshToken));

    await expect(
      service.updateRefreshToken(
        repository as never,
        userId,
        initialTokens.refreshToken,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(storedHash).toBe(hashRefreshToken(rotatedTokens.refreshToken));
  });
});
