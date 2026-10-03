import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { Result } from 'src/domain/result/result';
import { UserMapper } from 'src/user/user.mapper';
import { UserService } from 'src/user/user.service';
import { UserStatus } from 'src/user/constants/constants';
import { AccountAccessService } from './account-access.service';
import { AccessTokenStrategy } from './strategies/access-token-strategy';
import { AuthService } from './auth.service';
import { OrderGateway } from 'src/order/realtime/order.gateway';
import { OrderEventPublisher } from 'src/order/realtime/order-event.publisher';
import { AccessRevocationPublisher } from './access-revocation.publisher';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;
const configValues = {
  JWT_ACCESS_TOKEN_SECRET: 'a4-access-secret-at-least-32-characters',
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
  JWT_REFRESH_TOKEN_SECRET: 'a4-refresh-secret-at-least-32-characters',
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: '1d',
};

describeWithMongo('Account suspension revocation (MongoDB)', () => {
  let connection: Connection;
  let model: Model<UserDataModel>;
  let repository: UserRepository;
  let authService: AuthService;
  let userService: UserService;
  let strategy: AccessTokenStrategy;
  let jwtService: JwtService;
  let principal: unknown;
  let publishedUserIds: string[];
  let accessRevocations: AccessRevocationPublisher;
  let userMapper: UserMapper;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `account_revocation_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    model = connection.model<UserDataModel>(UserDataModel.name, UserSchema);
    await model.syncIndexes();
    userMapper = new UserMapper(new AuditMapper());
    repository = new UserRepository(model as never, connection, userMapper);
  });

  beforeEach(() => {
    principal = undefined;
    publishedUserIds = [];
    accessRevocations = new AccessRevocationPublisher();
    accessRevocations.revocations$.subscribe((userId) =>
      publishedUserIds.push(userId),
    );
    jwtService = new JwtService();
    const config = {
      get: (key: keyof typeof configValues) => configValues[key],
      getOrThrow: (key: keyof typeof configValues) => configValues[key],
    } as ConfigService;
    authService = new AuthService(jwtService, config);
    strategy = new AccessTokenStrategy(
      config,
      { setPrincipal: (value: unknown) => (principal = value) } as never,
      new AccountAccessService(repository),
    );
    userService = new UserService(
      jwtService,
      config,
      {
        sendAccountVerificationEmail: () =>
          Promise.resolve(Result.ok(undefined)),
        sendRegistrationCompletionEmail: () =>
          Promise.resolve(Result.ok(undefined)),
        sendPasswordResetInstructionsEmail: () =>
          Promise.resolve(Result.ok(undefined)),
        sendEmailChangeConfirmationEmail: () =>
          Promise.resolve(Result.ok(undefined)),
      } as never,
      userMapper,
      { getContext: () => ({ email: 'administrator@example.com' }) } as never,
      repository,
      accessRevocations,
    );
  });

  afterEach(async () => model.deleteMany({}));

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  async function createActiveUser() {
    const userId = new Types.ObjectId();
    const tokens = await authService.generateAuthTokens({
      userId,
      email: `${randomUUID()}@example.com`,
      role: Role.END_USER,
    });
    await model.create({
      _id: userId,
      name: 'A4 User',
      email: `${randomUUID()}@example.com`,
      phoneNumber: randomUUID(),
      passwordHash: 'not-used',
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      refreshTokenHash: createHash('sha256')
        .update(tokens.refreshToken, 'utf8')
        .digest('hex'),
      savedAddress: { city: '', subCity: '' },
      auditCreatedBy: 'test@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    });
    return { userId, tokens };
  }

  async function authenticate(accessToken: string) {
    const payload = await jwtService.verifyAsync(accessToken, {
      secret: configValues.JWT_ACCESS_TOKEN_SECRET,
    });
    return strategy.validate(payload);
  }

  it('accepts a real access token while ACTIVE and rejects the same token after suspension', async () => {
    const { userId, tokens } = await createActiveUser();

    await expect(authenticate(tokens.accessToken)).resolves.toBeDefined();
    expect(principal).toMatchObject({ userId: userId.toString() });

    await userService.suspendUser(userId);
    principal = undefined;

    await expect(authenticate(tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(principal).toBeUndefined();
    expect(publishedUserIds).toEqual([userId.toString()]);
  });

  it('atomically clears refresh state and reactivation does not revive the old token', async () => {
    const { userId, tokens } = await createActiveUser();

    await userService.suspendUser(userId);
    const suspended = await model.findById(userId).lean().exec();
    expect(suspended?.status).toBe(UserStatus.SUSPENDED);
    expect(suspended?.refreshTokenHash).toBeNull();
    await expect(
      authService.updateRefreshToken(repository, userId, tokens.refreshToken),
    ).rejects.toBeDefined();

    await model.updateOne({ _id: userId }, { status: UserStatus.ACTIVE });
    await expect(
      authService.updateRefreshToken(repository, userId, tokens.refreshToken),
    ).rejects.toBeDefined();
  });

  it('routes admin status updates through the same suspension revocation operation', async () => {
    const { userId, tokens } = await createActiveUser();

    await userService.adminUpdateUser(userId, {
      status: UserStatus.SUSPENDED,
    });

    const suspended = await model.findById(userId).lean().exec();
    expect(suspended?.status).toBe(UserStatus.SUSPENDED);
    expect(suspended?.refreshTokenHash).toBeNull();
    expect(publishedUserIds).toEqual([userId.toString()]);
    principal = undefined;
    await expect(authenticate(tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(principal).toBeUndefined();
    await expect(
      authService.updateRefreshToken(repository, userId, tokens.refreshToken),
    ).rejects.toBeDefined();
  });

  it('rejects non-ACTIVE and missing users without setting a principal', async () => {
    const { userId, tokens } = await createActiveUser();
    await model.updateOne({ _id: userId }, { status: UserStatus.PENDING });
    await expect(authenticate(tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await model.deleteOne({ _id: userId });
    await expect(authenticate(tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(principal).toBeUndefined();
  });

  it('accepts an ACTIVE socket and rejects the same JWT after suspension', async () => {
    const { userId, tokens } = await createActiveUser();
    const gateway = new OrderGateway(
      jwtService,
      {
        getOrThrow: (key: keyof typeof configValues) => configValues[key],
      } as ConfigService,
      new OrderEventPublisher(),
      new AccountAccessService(repository),
      accessRevocations,
      { warn: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    const disconnectSockets = jest.fn();
    (gateway as unknown as { server: unknown }).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      in: jest.fn().mockReturnValue({ disconnectSockets }),
    };
    gateway.afterInit();
    const activeClient = {
      id: 'active-socket',
      handshake: { auth: { token: tokens.accessToken }, headers: {} },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };
    await gateway.handleConnection(activeClient as never);
    expect(activeClient.data).toMatchObject({
      principal: { userId: userId.toString() },
    });
    expect(activeClient.join).toHaveBeenCalledWith(`user:${userId}`);

    await userService.suspendUser(userId);
    expect(disconnectSockets).toHaveBeenCalledWith(true);
    const suspendedClient = {
      id: 'suspended-socket',
      handshake: { auth: { token: tokens.accessToken }, headers: {} },
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
    };
    await gateway.handleConnection(suspendedClient as never);
    expect(suspendedClient.disconnect).toHaveBeenCalledWith(true);
    expect(suspendedClient.join).not.toHaveBeenCalled();
    gateway.onModuleDestroy();
  });
});
