import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { AccountActionPurpose } from 'src/infrastructure/auth/interfaces/auth.interface';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { User } from './user';
import { UserStatus } from './constants/constants';
import { UserMapper } from './user.mapper';
import { UserService } from './user.service';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;
const jwtSecret = 'admin-registration-integration-secret-at-least-32-chars';

describeWithMongo('UserService administrator registration (MongoDB)', () => {
  let connection: Connection;
  let model: Model<UserDataModel>;
  let service: UserService;
  let registrationEmails: Array<{
    user: Pick<User, 'name' | 'email'>;
    token: string;
  }>;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `admin_registration_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    model = connection.model<UserDataModel>(UserDataModel.name, UserSchema);
    await model.syncIndexes();
  });

  beforeEach(() => {
    registrationEmails = [];
    const mapper = new UserMapper(new AuditMapper());
    const repository = new UserRepository(model as never, connection, mapper);
    const emailService = {
      sendAccountVerificationEmail: () => Promise.resolve(Result.ok(undefined)),
      sendRegistrationCompletionEmail: (
        user: Pick<User, 'name' | 'email'>,
        token: string,
      ) => {
        registrationEmails.push({ user, token });
        return Promise.resolve(Result.ok(undefined));
      },
      sendPasswordResetInstructionsEmail: () =>
        Promise.resolve(Result.ok(undefined)),
      sendEmailChangeConfirmationEmail: () =>
        Promise.resolve(Result.ok(undefined)),
    };
    const config = {
      JWT_VERIFICATION_TOKEN_SECRET: jwtSecret,
      JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: '15m',
      JWT_ACCESS_TOKEN_SECRET: 'admin-registration-access-secret',
      JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
      JWT_REFRESH_TOKEN_SECRET: 'admin-registration-refresh-secret',
      JWT_REFRESH_TOKEN_EXPIRATION_TIME: '1d',
    };
    service = new UserService(
      new JwtService(),
      { get: (key: keyof typeof config) => config[key] } as ConfigService,
      emailService as never,
      mapper,
      { getContext: () => ({ email: 'system@example.com' }) } as never,
      repository,
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

  const adminInput = (email = `${randomUUID()}@example.com`) => ({
    name: 'New Administrator',
    email,
    phoneNumber: '251911111111',
  });

  const load = (id: Types.ObjectId): Promise<any> =>
    model.findById(id).lean().exec() as Promise<any>;

  const issue = async (
    userId: Types.ObjectId,
    purpose: AccountActionPurpose,
    email: string,
    expiresIn = '15m',
  ): Promise<string> => {
    const jti = randomUUID();
    await model.findByIdAndUpdate(userId, {
      $set: {
        [`accountActions.${purpose}`]: {
          tokenHash: createHash('sha256').update(jti).digest('hex'),
        },
      },
    });
    return new JwtService().signAsync(
      { sub: userId.toString(), purpose, jti, email },
      { secret: jwtSecret, expiresIn },
    );
  };

  it('creates a pending administrator without a known or exposed default credential', async () => {
    const result = await service.createCompanyAdmin(adminInput());
    const response = result.getValue();
    const persisted = await load(response.id);

    expect(persisted.status).toBe(UserStatus.PENDING);
    await expect(
      bcrypt.compare('password', persisted.passwordHash),
    ).resolves.toBe(false);
    expect(JSON.stringify(response)).not.toContain('passwordHash');
    expect(registrationEmails).toHaveLength(1);
    expect(JSON.stringify(registrationEmails[0])).not.toContain(
      persisted.passwordHash,
    );
    expect(persisted.accountActions.ADMIN_REGISTRATION.tokenHash).toHaveLength(
      64,
    );
    expect(JSON.stringify(persisted)).not.toContain(
      registrationEmails[0].token,
    );
  });

  it('completes registration once and permits normal sign-in with the selected password', async () => {
    const result = await service.createRestaurantAdmin(adminInput());
    const admin = result.getValue();
    const placeholderHash = (await load(admin.id)).passwordHash;
    const token = registrationEmails[0].token;

    await service.completeAdminRegistration(token, {
      newPassword: 'Selected1!',
      confirmPassword: 'Selected1!',
    });

    const persisted = await load(admin.id);
    expect(persisted.status).toBe(UserStatus.ACTIVE);
    expect(persisted.passwordHash).not.toBe(placeholderHash);
    await expect(
      bcrypt.compare('Selected1!', persisted.passwordHash),
    ).resolves.toBe(true);
    expect(persisted.accountActions?.ADMIN_REGISTRATION).toBeUndefined();
    await expect(
      service.signIn({ email: admin.email, password: 'Selected1!' }),
    ).resolves.toMatchObject({ isSuccess: true });

    await expect(
      service.completeAdminRegistration(token, {
        newPassword: 'Replacement1!',
        confirmPassword: 'Replacement1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      bcrypt.compare('Selected1!', (await load(admin.id)).passwordHash),
    ).resolves.toBe(true);
  });

  it('rejects cross-purpose use in both directions through real JWT validation', async () => {
    const result = await service.createCompanyAdmin(adminInput());
    const admin = result.getValue();
    const registration = registrationEmails[0].token;
    const verification = await issue(
      admin.id,
      AccountActionPurpose.EMAIL_VERIFICATION,
      admin.email,
    );
    const reset = await issue(
      admin.id,
      AccountActionPurpose.PASSWORD_RESET,
      admin.email,
    );
    const password = {
      newPassword: 'Selected1!',
      confirmPassword: 'Selected1!',
    };

    await expect(
      service.completeAdminRegistration(verification, password),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.completeAdminRegistration(reset, password),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.confirmPasswordReset(registration, password),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('does not alter or consume registration after the administrator is suspended', async () => {
    const result = await service.createCompanyAdmin(adminInput());
    const admin = result.getValue();
    const token = registrationEmails[0].token;
    const before = await load(admin.id);
    await model.findByIdAndUpdate(admin.id, { status: UserStatus.SUSPENDED });

    await expect(
      service.completeAdminRegistration(token, {
        newPassword: 'Selected1!',
        confirmPassword: 'Selected1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    const after = await load(admin.id);
    expect(after.status).toBe(UserStatus.SUSPENDED);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.accountActions.ADMIN_REGISTRATION).toEqual(
      before.accountActions.ADMIN_REGISTRATION,
    );
  });

  it('enforces the administrator role prerequisite in the Mongo match', async () => {
    const email = `${randomUUID()}@example.com`;
    const user = await model.create({
      _id: new Types.ObjectId(),
      name: 'End User',
      email,
      phoneNumber: '251922222222',
      passwordHash: await bcrypt.hash('Current1!', 4),
      role: Role.END_USER,
      status: UserStatus.PENDING,
      accountActions: {},
      auditCreatedBy: email,
      auditCreatedDateTime: new Date().toISOString(),
    });
    const token = await issue(
      user._id,
      AccountActionPurpose.ADMIN_REGISTRATION,
      email,
    );
    const before = await load(user._id);

    await expect(
      service.completeAdminRegistration(token, {
        newPassword: 'Selected1!',
        confirmPassword: 'Selected1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    const after = await load(user._id);
    expect(after.status).toBe(UserStatus.PENDING);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.accountActions.ADMIN_REGISTRATION).toBeDefined();
  });

  it('allows exactly one concurrent registration completion', async () => {
    const result = await service.createRestaurantAdmin(adminInput());
    const admin = result.getValue();
    const token = registrationEmails[0].token;
    const attempts = await Promise.allSettled([
      service.completeAdminRegistration(token, {
        newPassword: 'WinnerA1!',
        confirmPassword: 'WinnerA1!',
      }),
      service.completeAdminRegistration(token, {
        newPassword: 'WinnerB1!',
        confirmPassword: 'WinnerB1!',
      }),
    ]);

    expect(
      attempts.filter((attempt) => attempt.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((attempt) => attempt.status === 'rejected'),
    ).toHaveLength(1);
    const persisted = await load(admin.id);
    const matches = await Promise.all([
      bcrypt.compare('WinnerA1!', persisted.passwordHash),
      bcrypt.compare('WinnerB1!', persisted.passwordHash),
    ]);
    expect(matches.filter(Boolean)).toHaveLength(1);
    expect(persisted.status).toBe(UserStatus.ACTIVE);
    expect(persisted.accountActions?.ADMIN_REGISTRATION).toBeUndefined();
  });

  it('rejects an expired registration JWT without changing or consuming state', async () => {
    const result = await service.createCompanyAdmin(adminInput());
    const admin = result.getValue();
    const expired = await issue(
      admin.id,
      AccountActionPurpose.ADMIN_REGISTRATION,
      admin.email,
      '-1s',
    );
    const before = await load(admin.id);

    await expect(
      service.completeAdminRegistration(expired, {
        newPassword: 'Selected1!',
        confirmPassword: 'Selected1!',
      }),
    ).rejects.toMatchObject({ status: 400 });
    const after = await load(admin.id);
    expect(after.status).toBe(UserStatus.PENDING);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.accountActions.ADMIN_REGISTRATION).toEqual(
      before.accountActions.ADMIN_REGISTRATION,
    );
  });
});
