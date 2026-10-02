import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import {
  Connection,
  createConnection,
  Document,
  Schema,
  Types,
} from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { UserStatus } from 'src/user/constants/constants';
import { AuthService } from './auth.service';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;
const hashRefreshToken = (refreshToken: string): string =>
  createHash('sha256').update(refreshToken, 'utf8').digest('hex');

describeWithMongo('AuthService refresh rotation (MongoDB)', () => {
  let connection: Connection;

  beforeAll(async () => {
    const databaseName = `refresh_rotation_${randomUUID().replaceAll('-', '')}`;
    connection = await createConnection(mongoUri!, {
      dbName: databaseName,
    }).asPromise();
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('allows exactly one concurrent replacement of the same refresh token', async () => {
    const userId = new Types.ObjectId();
    const userSchema = new Schema(
      {
        _id: Schema.Types.ObjectId,
        email: String,
        role: String,
        status: String,
        refreshTokenHash: String,
      },
      { versionKey: false },
    );
    const userModel = connection.model<Document>(
      'RefreshRotationUser',
      userSchema,
    );
    const repository = new (class extends GenericDocumentRepository<
      Record<string, unknown>,
      Document
    > {})(userModel, connection, {
      toDomain: (document: Document & Record<string, unknown>) => ({
        ...document.toObject(),
        id: document._id,
      }),
    });
    const jwtService = new JwtService();
    const config = {
      JWT_ACCESS_TOKEN_SECRET: 'access-secret-for-integration-tests',
      JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
      JWT_REFRESH_TOKEN_SECRET: 'refresh-secret-for-integration-tests',
      JWT_REFRESH_TOKEN_EXPIRATION_TIME: '1d',
    };
    const service = new AuthService(jwtService, {
      get: (key: keyof typeof config) => config[key],
    } as unknown as ConfigService);
    const initialTokens = await service.generateAuthTokens({
      userId,
      email: 'concurrent@example.com',
      role: Role.END_USER,
    });
    await userModel.create({
      _id: userId,
      email: 'concurrent@example.com',
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      refreshTokenHash: hashRefreshToken(initialTokens.refreshToken),
    });

    const attempts = await Promise.allSettled([
      service.updateRefreshToken(
        repository,
        userId,
        initialTokens.refreshToken,
      ),
      service.updateRefreshToken(
        repository,
        userId,
        initialTokens.refreshToken,
      ),
    ]);
    const winners = attempts.filter(
      (
        attempt,
      ): attempt is PromiseFulfilledResult<Awaited<typeof initialTokens>> =>
        attempt.status === 'fulfilled',
    );
    const losers = attempts.filter((attempt) => attempt.status === 'rejected');
    const persistedUser = await userModel.findById(userId).lean().exec();

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(
      (persistedUser as { refreshTokenHash?: string } | null)?.refreshTokenHash,
    ).toBe(hashRefreshToken(winners[0].value.refreshToken));
  });
});
