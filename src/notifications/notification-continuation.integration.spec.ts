import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import {
  NotificationDataModel,
  NotificationOutboxDataModel,
  NotificationOutboxSchema,
  NotificationSchema,
} from './notification.schema';
import { NotificationOutboxService } from './notification-outbox.service';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Notification continuation (MongoDB)', () => {
  let connection: Connection;
  let outbox: Model<NotificationOutboxDataModel>;
  let notifications: Model<NotificationDataModel>;
  let service: NotificationOutboxService;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `notification_continuation_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    outbox = connection.model(
      NotificationOutboxDataModel.name,
      NotificationOutboxSchema,
    );
    notifications = connection.model(
      NotificationDataModel.name,
      NotificationSchema,
    );
    await notifications.syncIndexes();
    service = new NotificationOutboxService(
      outbox as never,
      notifications as never,
    );
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('continues by ObjectId in descending order without crossing recipients', async () => {
    const recipientA = new Types.ObjectId();
    const recipientB = new Types.ObjectId();
    const ids = Array.from(
      { length: 7 },
      (_, index) =>
        new Types.ObjectId(
          (BigInt('0x710000000000000000000000') + BigInt(index)).toString(16),
        ),
    );
    await notifications.insertMany([
      ...ids.map((id, index) => ({
        _id: id,
        recipientId: recipientA,
        orderId: new Types.ObjectId(),
        title: 'Update',
        message: `A${index}`,
        sourceEventKey: `a-${index}`,
      })),
      {
        recipientId: recipientB,
        orderId: new Types.ObjectId(),
        title: 'Update',
        message: 'B',
        sourceEventKey: 'b-0',
      },
    ]);

    const first = await service.getForRecipient(recipientA, { limit: 3 });
    const second = await service.getForRecipient(recipientA, {
      limit: 3,
      before: new Types.ObjectId(first.at(-1)!.id),
    });
    const third = await service.getForRecipient(recipientA, {
      limit: 3,
      before: new Types.ObjectId(second.at(-1)!.id),
    });
    const exhausted = await service.getForRecipient(recipientA, {
      limit: 3,
      before: new Types.ObjectId(third.at(-1)!.id),
    });
    const combined = [...first, ...second, ...third];

    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
    expect(third).toHaveLength(1);
    expect(exhausted).toEqual([]);
    expect(new Set(combined.map(({ id }) => id))).toHaveProperty('size', 7);
    expect(combined.map(({ id }) => id)).toEqual(
      [...combined]
        .map(({ id }) => id)
        .sort()
        .reverse(),
    );
    expect(combined.map(({ message }) => message)).not.toContain('B');
  });
});
