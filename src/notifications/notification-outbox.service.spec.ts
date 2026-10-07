import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { OrderStatus } from 'src/order/constants/constants';
import { NotificationOutboxService } from './notification-outbox.service';
import { OutboxStatus } from './notification.schema';

describe('NotificationOutboxService', () => {
  it('distinguishes same-millisecond status transitions in source keys', async () => {
    const create = jest
      .fn<
        Promise<void>,
        [Array<{ deduplicationKey: string }>, Record<string, unknown>]
      >()
      .mockResolvedValue(undefined);
    const service = new NotificationOutboxService(
      { create } as never,
      {} as never,
    );
    const orderId = new Types.ObjectId();
    const order = {
      id: orderId,
      userId: new Types.ObjectId(),
    } as never;
    const transition = {
      from: OrderStatus.PENDING,
      to: OrderStatus.ACCEPTED,
      actorId: new Types.ObjectId(),
      actorRole: Role.RESTAURANT_ADMINISTRATOR,
      occurredAt: '2026-10-04T00:00:00.000Z',
    };

    await service.enqueueOrderStatusChange(order, transition, {} as never);
    await service.enqueueOrderStatusChange(
      order,
      { ...transition, to: OrderStatus.CANCELLED },
      {} as never,
    );

    const firstKey = create.mock.calls[0][0][0].deduplicationKey;
    const secondKey = create.mock.calls[1][0][0].deduplicationKey;
    expect(firstKey).toBe(
      `order.status_changed:${orderId.toString()}:${transition.occurredAt}:${OrderStatus.ACCEPTED}`,
    );
    expect(secondKey).toBe(
      `order.status_changed:${orderId.toString()}:${transition.occurredAt}:${OrderStatus.CANCELLED}`,
    );
    expect(firstKey).not.toBe(secondKey);
  });

  it('preserves retry and dead-letter thresholds behind the claim fence', async () => {
    const updateOne = jest
      .fn<
        Promise<{ matchedCount: number }>,
        [
          Record<string, unknown>,
          {
            $set: {
              status: OutboxStatus;
              nextAttemptAt: Date;
              lastError: string;
            };
            $unset: { lockedAt: number; claimId: number };
          },
        ]
      >()
      .mockResolvedValue({ matchedCount: 1 });
    const service = new NotificationOutboxService(
      { updateOne } as never,
      {} as never,
    );
    const baseEvent = {
      _id: new Types.ObjectId(),
      claimId: 'current-claim',
    };

    await expect(
      service.reschedule(
        { ...baseEvent, attempts: 4 } as never,
        new TypeError('retry'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.reschedule(
        { ...baseEvent, attempts: 5 } as never,
        new Error('dead letter'),
      ),
    ).resolves.toBe(true);

    expect(updateOne.mock.calls[0][0]).toEqual({
      _id: baseEvent._id,
      status: OutboxStatus.PROCESSING,
      claimId: baseEvent.claimId,
    });
    expect(updateOne.mock.calls[0][1]).toMatchObject({
      $set: {
        status: OutboxStatus.PENDING,
        lastError: 'TypeError',
      },
      $unset: { lockedAt: 1, claimId: 1 },
    });
    expect(updateOne.mock.calls[0][1].$set.nextAttemptAt).toBeInstanceOf(Date);
    expect(updateOne.mock.calls[1][1]).toMatchObject({
      $set: {
        status: OutboxStatus.DEAD_LETTER,
        lastError: 'Error',
      },
      $unset: { lockedAt: 1, claimId: 1 },
    });
    expect(updateOne.mock.calls[1][1].$set.nextAttemptAt).toBeInstanceOf(Date);
  });
});
