import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { UserStatus } from 'src/user/constants/constants';
import { UserMapper } from 'src/user/user.mapper';
import { UserService } from 'src/user/user.service';
import { AccountAccessService } from './account-access.service';
import { AuthService } from './auth.service';
import { AccessTokenStrategy } from './strategies/access-token-strategy';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;
const configValues = {
  JWT_ACCESS_TOKEN_SECRET: 'access-token-test-secret-at-least-32-characters',
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
  JWT_REFRESH_TOKEN_SECRET: 'refresh-token-test-secret-at-least-32-characters',
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: '1d',
  JWT_VERIFICATION_TOKEN_SECRET:
    'account-action-test-secret-at-least-32-characters',
  JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: '15m',
};

describeWithMongo('Stable authenticated identity (MongoDB)', () => {
  let connection: Connection;
  let model: Model<UserDataModel>;
  let repository: UserRepository;
  let userService: UserService;
  let strategy: AccessTokenStrategy;
  let jwtService: JwtService;
  let context: Context;
  let emailChangeToken: string | undefined;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `stable_identity_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    model = connection.model<UserDataModel>(UserDataModel.name, UserSchema);
    await model.syncIndexes();
    repository = new UserRepository(
      model as never,
      connection,
      new UserMapper(new AuditMapper()),
    );
  });

  beforeEach(() => {
    context = new Context('guest@example.com', randomUUID());
    emailChangeToken = undefined;
    jwtService = new JwtService();
    const config = {
      get: (key: keyof typeof configValues) => configValues[key],
      getOrThrow: (key: keyof typeof configValues) => configValues[key],
    } as ConfigService;
    const contextService = {
      getContext: () => context,
      setPrincipal: (
        principal: Parameters<Context['setPrincipal']>[0],
        token?: string,
      ) => context.setPrincipal(principal, token),
    };
    strategy = new AccessTokenStrategy(
      config,
      contextService as never,
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
        sendEmailChangeConfirmationEmail: (
          _user: unknown,
          _newEmail: string,
          token: string,
        ) => {
          emailChangeToken = token;
          return Promise.resolve(Result.ok(undefined));
        },
      } as never,
      new UserMapper(new AuditMapper()),
      contextService as never,
      repository,
      { publish: jest.fn() } as never,
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

  async function createActiveUser(email: string, name: string) {
    return model.create({
      _id: new Types.ObjectId(),
      name,
      email,
      phoneNumber: `+2519${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await bcrypt.hash('Current1!', 4),
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      accountActions: {},
      savedAddress: { city: '', subCity: '' },
      auditCreatedBy: email,
      auditCreatedDateTime: new Date().toISOString(),
    });
  }

  async function authenticate(accessToken: string) {
    const payload = await jwtService.verifyAsync(accessToken, {
      secret: configValues.JWT_ACCESS_TOKEN_SECRET,
    });
    return strategy.validate(payload);
  }

  it('keeps the original actor after email change and old-email reuse', async () => {
    const oldEmail = 'old-a@example.com';
    const newEmail = 'new-a@example.com';
    const userA = await createActiveUser(oldEmail, 'User A');
    const oldTokens = await new AuthService(jwtService, {
      get: (key: keyof typeof configValues) => configValues[key],
    } as ConfigService).generateAuthTokens({
      userId: userA._id,
      email: oldEmail,
      role: Role.END_USER,
    });

    await authenticate(oldTokens.accessToken);
    await userService.requestToChangeEmail(userA._id, {
      currentPassword: 'Current1!',
      newEmail,
    });
    expect(emailChangeToken).toBeDefined();
    await userService.verifyNewEmail(emailChangeToken!);

    const userB = await createActiveUser(oldEmail, 'User B');
    context = new Context('guest@example.com', randomUUID());
    const authenticatedPrincipal = await authenticate(oldTokens.accessToken);

    expect(authenticatedPrincipal.email).toBe(newEmail);
    expect(context).toMatchObject({
      userId: userA._id.toString(),
      email: newEmail,
    });
    const resolved = await userService.getContextUser();
    expect(resolved.id.toString()).toBe(userA._id.toString());
    expect(resolved.id.toString()).not.toBe(userB._id.toString());
    expect(resolved.email).toBe(newEmail);

    await expect(userService.getUserById(userA._id)).resolves.toMatchObject({
      isSuccess: true,
    });
    await expect(userService.getUserById(userB._id)).rejects.toMatchObject({
      status: 403,
    });

    await userService.updateProfile(userA._id, { name: 'Updated User A' });
    const updated = await model.findById(userA._id).lean().exec();
    expect(updated?.auditModifiedBy).toBe(newEmail);
    expect(updated?.auditModifiedBy).not.toBe(oldEmail);
  });

  it.each([undefined, 'not-an-object-id'])(
    'does not fall back to email for missing or malformed userId: %s',
    async (userId) => {
      const email = `${randomUUID()}@example.com`;
      await createActiveUser(email, 'Fallback Target');
      context = new Context(email);
      if (userId) {
        context.setPrincipal({ userId, email, role: Role.END_USER });
      }

      await expect(userService.getContextUser()).rejects.toMatchObject({
        status: 404,
      });
    },
  );
});
