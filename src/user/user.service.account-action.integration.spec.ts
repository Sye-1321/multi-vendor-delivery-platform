import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { AccountActionPurpose } from 'src/infrastructure/auth/interfaces/auth.interface';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { AuditMapper } from 'src/audit/audit.mapper';
import { UserStatus } from './constants/constants';
import { User } from './user';
import { UserMapper } from './user.mapper';
import { UserService } from './user.service';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('UserService account actions (MongoDB)', () => {
  let connection: Connection;
  let model: Model<UserDataModel>;
  let repository: UserRepository;
  let service: UserService;
  let currentEmail: string;
  let currentUserId: string;
  let deliveredEmailChangeTokens: string[];
  let deliveredVerificationTokens: Array<{ email: string; token: string }>;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `account_actions_${randomUUID().replaceAll('-', '')}`,
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
    deliveredEmailChangeTokens = [];
    deliveredVerificationTokens = [];
    const emailService = {
      sendAccountVerificationEmail: (user: User, token: string) => {
        deliveredVerificationTokens.push({ email: user.email, token });
        return Promise.resolve(Result.ok(undefined));
      },
      sendRegistrationCompletionEmail: () =>
        Promise.resolve(Result.ok(undefined)),
      sendPasswordResetInstructionsEmail: () =>
        Promise.resolve(Result.ok(undefined)),
      sendEmailChangeConfirmationEmail: (
        _user: unknown,
        _newEmail: string,
        token: string,
      ) => {
        deliveredEmailChangeTokens.push(token);
        return Promise.resolve(Result.ok(undefined));
      },
    };
    const config = {
      JWT_VERIFICATION_TOKEN_SECRET:
        'account-action-integration-secret-at-least-32-chars',
      JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: '15m',
    };
    service = new UserService(
      new JwtService(),
      { get: (key: keyof typeof config) => config[key] } as ConfigService,
      emailService as never,
      {} as never,
      {
        getContext: () => ({ email: currentEmail, userId: currentUserId }),
      } as never,
      repository,
      { publish: jest.fn() } as never,
    );
  });

  afterEach(async () => {
    await model.deleteMany({});
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  const createUser = async (
    status = UserStatus.ACTIVE,
    email = `${randomUUID()}@example.com`,
    role: Role = Role.END_USER,
  ) => {
    const document = await model.create({
      _id: new Types.ObjectId(),
      email,
      name: 'Action User',
      phoneNumber: '123',
      passwordHash: await bcrypt.hash('Current1!', 4),
      role,
      status,
      refreshTokenHash: 'live-refresh-session',
      accountActions: {},
      auditCreatedBy: email,
      auditCreatedDateTime: new Date().toISOString(),
    });
    currentEmail = email;
    currentUserId = document._id.toString();
    return document;
  };

  it('resends verification to a pending end user and consumes the replacement action', async () => {
    const user = await createUser(UserStatus.PENDING);
    await issue(user._id, AccountActionPurpose.EMAIL_VERIFICATION, user.email);

    const result = await service.resendEmailVerification({ email: user.email });
    const [{ email, token }] = deliveredVerificationTokens;

    expect(result).toMatchObject({ isSuccess: true });
    expect(email).toBe(user.email);
    expect((await loadUser(user._id)).status).toBe(UserStatus.PENDING);

    await service.verifyEmail(token);

    const verified = await loadUser(user._id);
    expect(verified.status).toBe(UserStatus.ACTIVE);
    expect(verified.accountActions?.EMAIL_VERIFICATION).toBeUndefined();
  });

  it('returns the same verification resend result without mutation for missing and ineligible accounts', async () => {
    const activeUser = await createUser(UserStatus.ACTIVE);
    const pendingAdmin = await createUser(
      UserStatus.PENDING,
      `${randomUUID()}@example.com`,
      Role.BUSINESS_ADMINISTRATOR,
    );
    const activeBefore = await loadUser(activeUser._id);
    const adminBefore = await loadUser(pendingAdmin._id);

    const results = await Promise.all([
      service.resendEmailVerification({ email: 'missing@example.com' }),
      service.resendEmailVerification({ email: activeUser.email }),
      service.resendEmailVerification({ email: pendingAdmin.email }),
    ]);

    expect(
      results.map(({ isSuccess, message }) => ({ isSuccess, message })),
    ).toEqual([
      { isSuccess: true, message: results[0].message },
      { isSuccess: true, message: results[0].message },
      { isSuccess: true, message: results[0].message },
    ]);
    expect(deliveredVerificationTokens).toHaveLength(0);
    expect(await loadUser(activeUser._id)).toEqual(activeBefore);
    expect(await loadUser(pendingAdmin._id)).toEqual(adminBefore);
  });

  const loadUser = async (userId: Types.ObjectId): Promise<any> =>
    model.findById(userId).lean().exec();

  const issue = async (
    userId: Types.ObjectId,
    purpose: AccountActionPurpose,
    email?: string,
    expiresIn?: string,
  ) => {
    const tokenId = randomUUID();
    const tokenHash = createHash('sha256')
      .update(tokenId, 'utf8')
      .digest('hex');
    await model.findByIdAndUpdate(userId, {
      $set: {
        [`accountActions.${purpose}`]: {
          tokenHash,
          ...(email ? { email } : {}),
        },
      },
    });
    const jwt = new JwtService();
    return jwt.signAsync(
      {
        sub: userId.toString(),
        purpose,
        jti: tokenId,
        ...(email ? { email } : {}),
      },
      {
        secret: 'account-action-integration-secret-at-least-32-chars',
        expiresIn: expiresIn ?? '15m',
      },
    );
  };

  it('rejects cross-purpose account-action tokens', async () => {
    const verificationUser = await createUser(UserStatus.PENDING);
    const verification = await issue(
      verificationUser._id,
      AccountActionPurpose.EMAIL_VERIFICATION,
      verificationUser.email,
    );
    await expect(
      service.confirmPasswordReset(verification, {
        newPassword: 'Changed1!',
        confirmPassword: 'Changed1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(service.verifyNewEmail(verification)).rejects.toMatchObject({
      status: 400,
    });

    const resetUser = await createUser();
    const reset = await issue(
      resetUser._id,
      AccountActionPurpose.PASSWORD_RESET,
      resetUser.email,
    );
    await expect(service.verifyEmail(reset)).rejects.toMatchObject({
      status: 400,
    });

    const changeUser = await createUser();
    const change = await issue(
      changeUser._id,
      AccountActionPurpose.EMAIL_CHANGE,
      `${randomUUID()}@example.com`,
    );
    await expect(
      service.confirmPasswordReset(change, {
        newPassword: 'Changed1!',
        confirmPassword: 'Changed1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepts each purpose once and rejects exact-token replay', async () => {
    const pending = await createUser(UserStatus.PENDING);
    const verification = await issue(
      pending._id,
      AccountActionPurpose.EMAIL_VERIFICATION,
      pending.email,
    );
    await service.verifyEmail(verification);
    await expect(service.verifyEmail(verification)).rejects.toMatchObject({
      status: 400,
    });

    const resetUser = await createUser();
    const oldHash = resetUser.passwordHash;
    const reset = await issue(
      resetUser._id,
      AccountActionPurpose.PASSWORD_RESET,
      resetUser.email,
    );
    await service.confirmPasswordReset(reset, {
      newPassword: 'Changed1!',
      confirmPassword: 'Changed1!',
    });
    await expect(
      service.confirmPasswordReset(reset, {
        newPassword: 'Changed2!',
        confirmPassword: 'Changed2!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    const afterReset = await loadUser(resetUser._id);
    expect(afterReset.passwordHash).not.toBe(oldHash);
    expect(afterReset.refreshTokenHash).toBeNull();

    const changeUser = await createUser();
    const target = `${randomUUID()}@example.com`;
    const change = await issue(
      changeUser._id,
      AccountActionPurpose.EMAIL_CHANGE,
      target,
    );
    await service.verifyNewEmail(change);
    await expect(service.verifyNewEmail(change)).rejects.toMatchObject({
      status: 400,
    });
    expect((await loadUser(changeUser._id)).email).toBe(target);
  });

  it('cannot reactivate a user whose status changed after verification issuance', async () => {
    const user = await createUser(UserStatus.PENDING);
    const token = await issue(
      user._id,
      AccountActionPurpose.EMAIL_VERIFICATION,
      user.email,
    );
    await model.findByIdAndUpdate(user._id, { status: UserStatus.SUSPENDED });
    await expect(service.verifyEmail(token)).rejects.toMatchObject({
      status: 400,
    });
    expect((await loadUser(user._id)).status).toBe(UserStatus.SUSPENDED);
  });

  it('supersedes an earlier email-change request and consumes the latest request once', async () => {
    const user = await createUser();
    const first = `${randomUUID()}@example.com`;
    const second = `${randomUUID()}@example.com`;
    await service.requestToChangeEmail(user._id, {
      currentPassword: 'Current1!',
      newEmail: first,
    });
    await service.requestToChangeEmail(user._id, {
      currentPassword: 'Current1!',
      newEmail: second,
    });
    const [firstToken, secondToken] = deliveredEmailChangeTokens;
    const outstanding = await loadUser(user._id);
    expect(outstanding.accountActions.EMAIL_CHANGE.email).toBe(second);
    expect(outstanding.accountActions.EMAIL_CHANGE.tokenHash).toHaveLength(64);
    expect(JSON.stringify(outstanding)).not.toContain(firstToken);
    expect(JSON.stringify(outstanding)).not.toContain(secondToken);
    await expect(service.verifyNewEmail(firstToken)).rejects.toMatchObject({
      status: 400,
    });
    expect((await loadUser(user._id)).email).toBe(user.email);
    await service.verifyNewEmail(secondToken);
    await expect(service.verifyNewEmail(secondToken)).rejects.toMatchObject({
      status: 400,
    });
    expect((await loadUser(user._id)).email).toBe(second);
  });

  it('preserves the pending action when confirmation loses an email uniqueness race', async () => {
    const ownerA = await createUser(UserStatus.ACTIVE, 'old-a@example.com');
    const target = 'target@example.com';
    await service.requestToChangeEmail(ownerA._id, {
      currentPassword: 'Current1!',
      newEmail: target,
    });
    const [token] = deliveredEmailChangeTokens;
    const beforeConflict = await loadUser(ownerA._id);
    const pendingAction = beforeConflict.accountActions.EMAIL_CHANGE;

    const ownerB = await createUser(UserStatus.ACTIVE, target);

    await expect(service.verifyNewEmail(token)).rejects.toMatchObject({
      status: 409,
    });

    const persistedA = await loadUser(ownerA._id);
    const persistedB = await loadUser(ownerB._id);
    expect(persistedA.email).toBe('old-a@example.com');
    expect(persistedB.email).toBe(target);
    expect(persistedA.accountActions.EMAIL_CHANGE).toEqual(pendingAction);
  });

  it('rejects an expired password-reset token without changing state', async () => {
    const user = await createUser();
    const token = await issue(
      user._id,
      AccountActionPurpose.PASSWORD_RESET,
      user.email,
      '-1s',
    );
    const originalHash = user.passwordHash;
    await expect(
      service.confirmPasswordReset(token, {
        newPassword: 'Changed1!',
        confirmPassword: 'Changed1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect((await loadUser(user._id)).passwordHash).toBe(originalHash);
  });

  it('allows exactly one concurrent password-reset consumption', async () => {
    const user = await createUser();
    const token = await issue(
      user._id,
      AccountActionPurpose.PASSWORD_RESET,
      user.email,
    );
    const attempts = await Promise.allSettled([
      service.confirmPasswordReset(token, {
        newPassword: 'WinnerA1!',
        confirmPassword: 'WinnerA1!',
      }),
      service.confirmPasswordReset(token, {
        newPassword: 'WinnerB1!',
        confirmPassword: 'WinnerB1!',
      }),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    const persisted = await loadUser(user._id);
    expect(persisted.accountActions?.PASSWORD_RESET).toBeUndefined();
    expect(persisted.refreshTokenHash).toBeNull();
    expect(
      (await bcrypt.compare('WinnerA1!', persisted.passwordHash)) ||
        (await bcrypt.compare('WinnerB1!', persisted.passwordHash)),
    ).toBe(true);
    expect(JSON.stringify(persisted)).not.toContain(token);
  });
});
