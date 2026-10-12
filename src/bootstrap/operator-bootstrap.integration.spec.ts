import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { UserStatus } from 'src/user/constants/constants';
import { provisionOperators } from './operator-bootstrap';

const passwordHasher = bcrypt as unknown as {
  hash(value: string, rounds: number): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
};

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('operator bootstrap (MongoDB)', () => {
  let connection: Connection;
  let model: Model<UserDataModel>;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `operator_bootstrap_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    model = connection.model<UserDataModel>(UserDataModel.name, UserSchema);
    await model.syncIndexes();
  });

  afterEach(async () => model.deleteMany({}));

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  const environment = (suffix = ''): NodeJS.ProcessEnv => ({
    BOOTSTRAP_SYSTEM_ADMIN_NAME: `System Operator${suffix}`,
    BOOTSTRAP_SYSTEM_ADMIN_EMAIL: `system${suffix}@example.com`,
    BOOTSTRAP_SYSTEM_ADMIN_PHONE: '251911111111',
    BOOTSTRAP_SYSTEM_ADMIN_PASSWORD: `System1!${suffix}`,
    BOOTSTRAP_DELIVERY_ADMIN_NAME: `Delivery Operator${suffix}`,
    BOOTSTRAP_DELIVERY_ADMIN_EMAIL: `delivery${suffix}@example.com`,
    BOOTSTRAP_DELIVERY_ADMIN_PHONE: '251922222222',
    BOOTSTRAP_DELIVERY_ADMIN_PASSWORD: `Delivery1!${suffix}`,
  });

  it('creates active operators with hashed passwords and remains idempotent', async () => {
    const initial = environment();
    await provisionOperators(connection, initial);

    const created = await model
      .find({
        role: {
          $in: [Role.SYSTEM_ADMINISTRATOR, Role.DELIVERY_COMPANY_ADMINISTRATOR],
        },
      })
      .lean()
      .exec();
    expect(created).toHaveLength(2);
    for (const operator of created) {
      const password =
        operator.role === Role.SYSTEM_ADMINISTRATOR
          ? initial.BOOTSTRAP_SYSTEM_ADMIN_PASSWORD!
          : initial.BOOTSTRAP_DELIVERY_ADMIN_PASSWORD!;
      expect(operator.status).toBe(UserStatus.ACTIVE);
      expect(operator.passwordHash).not.toBe(password);
      await expect(
        passwordHasher.compare(password, operator.passwordHash),
      ).resolves.toBe(true);
      expect(operator.accountActions?.ADMIN_REGISTRATION).toBeUndefined();
      expect(operator.accountActions?.EMAIL_VERIFICATION).toBeUndefined();
      expect(operator.refreshTokenHash).toBeUndefined();
      expect(operator.auditCreatedBy).toBe(operator.email);
      expect(operator.auditCreatedDateTime).toBeTruthy();
    }
    const snapshots = created.map((operator) => ({
      id: operator._id.toString(),
      role: operator.role,
      passwordHash: operator.passwordHash,
      auditCreatedBy: operator.auditCreatedBy,
      auditCreatedDateTime: operator.auditCreatedDateTime,
    }));

    const rerun = await provisionOperators(connection, environment('-changed'));
    expect(rerun).toEqual(
      expect.arrayContaining([
        { role: Role.SYSTEM_ADMINISTRATOR, action: 'skipped' },
        { role: Role.DELIVERY_COMPANY_ADMINISTRATOR, action: 'skipped' },
      ]),
    );
    const after = await model.find({}).lean().exec();
    expect(after).toHaveLength(2);
    expect(
      after.map((operator) => ({
        id: operator._id.toString(),
        role: operator.role,
        passwordHash: operator.passwordHash,
        auditCreatedBy: operator.auditCreatedBy,
        auditCreatedDateTime: operator.auditCreatedDateTime,
      })),
    ).toEqual(expect.arrayContaining(snapshots));
  });

  it('does not modify or duplicate an existing suspended operator', async () => {
    const existing = await model.create({
      _id: new Types.ObjectId(),
      name: 'Suspended System Operator',
      email: 'suspended@example.com',
      phoneNumber: '251933333333',
      passwordHash: await passwordHasher.hash('Original1!', 4),
      role: Role.SYSTEM_ADMINISTRATOR,
      status: UserStatus.SUSPENDED,
      auditCreatedBy: 'suspended@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    });
    const before = existing.toObject();

    await provisionOperators(connection, environment());

    const systemOperators = await model
      .find({ role: Role.SYSTEM_ADMINISTRATOR })
      .lean()
      .exec();
    expect(systemOperators).toHaveLength(1);
    expect(systemOperators[0]).toEqual(before);
  });

  it('preflights an email conflict before creating either missing role', async () => {
    const input = environment();
    const ordinaryUser = await model.create({
      _id: new Types.ObjectId(),
      name: 'Existing Customer',
      email: input.BOOTSTRAP_DELIVERY_ADMIN_EMAIL,
      phoneNumber: '251944444444',
      passwordHash: await passwordHasher.hash('Customer1!', 4),
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      auditCreatedBy: input.BOOTSTRAP_DELIVERY_ADMIN_EMAIL,
      auditCreatedDateTime: new Date().toISOString(),
    });
    const before = ordinaryUser.toObject();

    await expect(provisionOperators(connection, input)).rejects.toThrow(
      'Bootstrap email conflict for DELIVERY_COMPANY_ADMINISTRATOR.',
    );

    expect(await model.findById(ordinaryUser._id).lean().exec()).toEqual(
      before,
    );
    expect(
      await model.countDocuments({
        role: {
          $in: [Role.SYSTEM_ADMINISTRATOR, Role.DELIVERY_COMPANY_ADMINISTRATOR],
        },
      }),
    ).toBe(0);
  });
});
