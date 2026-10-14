import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';
import { UserMapper } from 'src/user/user.mapper';
import { UserRepository } from './user.repository';
import { UserDataModel, UserSchema } from './schemas/user.schema';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Collection pagination (MongoDB)', () => {
  let connection: Connection;
  let users: Model<UserDataModel>;
  let repository: UserRepository;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `collection_pagination_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    users = connection.model(UserDataModel.name, UserSchema);
    await users.syncIndexes();
    repository = new UserRepository(
      users as never,
      connection,
      new UserMapper(new AuditMapper()),
    );
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('applies stable skip/limit pages while unpaginated calls remain complete', async () => {
    const base = new Types.ObjectId('700000000000000000000000');
    await users.insertMany(
      Array.from({ length: 25 }, (_, index) => ({
        _id: new Types.ObjectId(
          (BigInt(`0x${base.toString()}`) + BigInt(index)).toString(16),
        ),
        name: `User ${index}`,
        email: `user${index}@example.com`,
        phoneNumber: `2519${index.toString().padStart(8, '0')}`,
        passwordHash: 'hash',
        role: Role.END_USER,
        status: UserStatus.ACTIVE,
        auditCreatedBy: 'test',
        auditCreatedDateTime: new Date().toISOString(),
      })),
    );

    const first = (
      await repository.getUsers(
        { role: Role.END_USER },
        { limit: 20, offset: 0 },
      )
    ).getValue();
    const second = (
      await repository.getUsers(
        { role: Role.END_USER },
        { limit: 20, offset: 20 },
      )
    ).getValue();
    const exhausted = (
      await repository.getUsers(
        { role: Role.END_USER },
        { limit: 20, offset: 25 },
      )
    ).getValue();
    const complete = (
      await repository.getUsers({ role: Role.END_USER })
    ).getValue();

    expect(first).toHaveLength(20);
    expect(second).toHaveLength(5);
    expect(exhausted).toEqual([]);
    expect(complete).toHaveLength(25);
    expect(first.map((user) => user.id.toString())).toEqual(
      [...first].map((user) => user.id.toString()).sort(),
    );
    const firstIds = new Set(first.map((user) => user.id.toString()));
    expect(second.every((user) => !firstIds.has(user.id.toString()))).toBe(
      true,
    );
  });
});
