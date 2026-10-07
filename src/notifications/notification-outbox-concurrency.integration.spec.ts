import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { OrderStatus } from 'src/order/constants/constants';
import { NotificationOutboxService } from './notification-outbox.service';
import {
  NotificationDataModel,
  NotificationOutboxDataModel,
  NotificationOutboxDocument,
  NotificationOutboxSchema,
  NotificationSchema,
  OutboxStatus,
} from './notification.schema';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Notification outbox claim concurrency (MongoDB)', () => {
  let connection: Connection;
  let outbox: Model<NotificationOutboxDataModel>;
  let notifications: Model<NotificationDataModel>;
  let service: NotificationOutboxService;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `notification_outbox_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    outbox = connection.model(
      NotificationOutboxDataModel.name,
      NotificationOutboxSchema,
    );
    notifications = connection.model(
      NotificationDataModel.name,
      NotificationSchema,
    );
    await Promise.all([outbox.syncIndexes(), notifications.syncIndexes()]);
    service = new NotificationOutboxService(
      outbox as never,
      notifications as never,
    );
  });

  afterEach(async () => {
    await Promise.all([outbox.deleteMany({}), notifications.deleteMany({})]);
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  async function createPendingEvent(): Promise<NotificationOutboxDocument> {
    const orderId = new Types.ObjectId();
    return outbox.create({
      deduplicationKey: `order.status_changed:${orderId.toString()}:2026-10-04T00:00:00.000Z:${OrderStatus.ACCEPTED}`,
      eventType: 'order.status_changed',
      aggregateId: orderId,
      payload: {
        recipientId: new Types.ObjectId().toString(),
        orderId: orderId.toString(),
        status: OrderStatus.ACCEPTED,
      },
      status: OutboxStatus.PENDING,
      attempts: 0,
      nextAttemptAt: new Date(0),
    });
  }

  async function reclaimAfter(
    claim: NotificationOutboxDocument,
  ): Promise<NotificationOutboxDocument> {
    await outbox.updateOne(
      { _id: claim._id },
      { $set: { lockedAt: new Date(Date.now() - 61_000) } },
    );
    const reclaimed = await service.claimNext();
    expect(reclaimed).not.toBeNull();
    return reclaimed!;
  }

  it('rejects stale completion after reclaim and materializes one notification', async () => {
    const pending = await createPendingEvent();
    const claimA = await service.claimNext();

    expect(claimA).toMatchObject({
      status: OutboxStatus.PROCESSING,
      attempts: 1,
    });
    expect(claimA?.claimId).toEqual(expect.any(String));

    const claimB = await reclaimAfter(claimA!);
    expect(claimB._id).toEqual(pending._id);
    expect(claimB.claimId).toEqual(expect.any(String));
    expect(claimB.claimId).not.toBe(claimA!.claimId);
    expect(claimB.attempts).toBe(2);

    await expect(service.deliver(claimA!)).resolves.toBe(false);
    const afterStaleCompletion = await outbox.findById(pending._id).lean();
    expect(afterStaleCompletion).toMatchObject({
      status: OutboxStatus.PROCESSING,
      claimId: claimB.claimId,
      attempts: 2,
    });

    await expect(service.deliver(claimB)).resolves.toBe(true);
    const delivered = await outbox.findById(pending._id).lean();
    expect(delivered).toMatchObject({
      status: OutboxStatus.DELIVERED,
    });
    expect(delivered?.processedAt).toBeInstanceOf(Date);
    expect(delivered).not.toHaveProperty('claimId');
    expect(delivered).not.toHaveProperty('lockedAt');
    await expect(
      notifications.countDocuments({
        sourceEventKey: pending.deduplicationKey,
      }),
    ).resolves.toBe(1);
  });

  it('prevents stale failure from regressing a newer delivery', async () => {
    const pending = await createPendingEvent();
    const claimA = await service.claimNext();
    const claimB = await reclaimAfter(claimA!);

    await expect(service.deliver(claimB)).resolves.toBe(true);
    await expect(
      service.reschedule(claimA!, new Error('stale worker failure')),
    ).resolves.toBe(false);

    const delivered = await outbox.findById(pending._id).lean();
    expect(delivered).toMatchObject({
      status: OutboxStatus.DELIVERED,
      attempts: 2,
    });
    expect(delivered?.processedAt).toBeInstanceOf(Date);
    expect(delivered).not.toHaveProperty('claimId');
    expect(delivered).not.toHaveProperty('lockedAt');
    await expect(
      notifications.countDocuments({
        sourceEventKey: pending.deduplicationKey,
      }),
    ).resolves.toBe(1);
  });
});
