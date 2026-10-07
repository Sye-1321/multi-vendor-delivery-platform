import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import {
  ClientSession,
  FilterQuery,
  Model,
  Types,
  UpdateQuery,
} from 'mongoose';
import { OrderStatus } from 'src/order/constants/constants';
import { IOrderTransition } from 'src/order/interfaces/order.interface';
import { Order } from 'src/order/order';
import {
  NotificationDataModel,
  NotificationDocument,
  NotificationOutboxDataModel,
  NotificationOutboxDocument,
  OrderStatusNotificationPayload,
  OutboxStatus,
} from './notification.schema';

export interface NotificationView {
  id: string;
  orderId: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class NotificationOutboxService {
  constructor(
    @InjectModel(NotificationOutboxDataModel.name)
    private readonly outboxModel: Model<NotificationOutboxDocument>,
    @InjectModel(NotificationDataModel.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async enqueueOrderStatusChange(
    order: Order,
    transition: IOrderTransition,
    session: ClientSession,
  ): Promise<void> {
    await this.outboxModel.create(
      [
        {
          deduplicationKey: [
            'order.status_changed',
            order.id.toString(),
            transition.occurredAt,
            transition.to,
          ].join(':'),
          eventType: 'order.status_changed',
          aggregateId: order.id,
          payload: {
            recipientId: order.userId.toString(),
            orderId: order.id.toString(),
            status: transition.to,
          } satisfies OrderStatusNotificationPayload,
          status: OutboxStatus.PENDING,
          attempts: 0,
          nextAttemptAt: new Date(),
          correlationId: transition.correlationId,
        },
      ],
      { session },
    );
  }

  async claimNext(): Promise<NotificationOutboxDocument | null> {
    const now = new Date();
    const staleLock = new Date(now.getTime() - 60_000);
    const claimId = randomUUID();

    return this.outboxModel
      .findOneAndUpdate(
        {
          $or: [
            {
              status: OutboxStatus.PENDING,
              nextAttemptAt: { $lte: now },
            },
            {
              status: OutboxStatus.PROCESSING,
              lockedAt: { $lte: staleLock },
            },
          ],
        },
        {
          $set: {
            status: OutboxStatus.PROCESSING,
            lockedAt: now,
            claimId,
          },
          $inc: { attempts: 1 },
        },
        { new: true, sort: { nextAttemptAt: 1 } },
      )
      .exec();
  }

  async deliver(event: NotificationOutboxDocument): Promise<boolean> {
    const payload = event.payload;
    const copy = this.notificationCopy(payload.status);

    await this.notificationModel.updateOne(
      { sourceEventKey: event.deduplicationKey },
      {
        $setOnInsert: {
          recipientId: new Types.ObjectId(payload.recipientId),
          orderId: new Types.ObjectId(payload.orderId),
          title: copy.title,
          message: copy.message,
          sourceEventKey: event.deduplicationKey,
          readAt: null,
        },
      },
      { upsert: true },
    );

    const result = await this.outboxModel.updateOne(
      {
        _id: event._id,
        status: OutboxStatus.PROCESSING,
        claimId: event.claimId,
      },
      {
        $set: {
          status: OutboxStatus.DELIVERED,
          processedAt: new Date(),
        },
        $unset: {
          lockedAt: 1,
          claimId: 1,
          lastError: 1,
        },
      },
    );

    return result.matchedCount === 1;
  }

  async reschedule(
    event: NotificationOutboxDocument,
    error: unknown,
  ): Promise<boolean> {
    const deadLetter = event.attempts >= 5;
    const delayMs = Math.min(2 ** event.attempts * 1_000, 60_000);
    const update: UpdateQuery<NotificationOutboxDataModel> = {
      $set: {
        status: deadLetter ? OutboxStatus.DEAD_LETTER : OutboxStatus.PENDING,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lastError: error instanceof Error ? error.name : 'delivery_failed',
      },
      $unset: { lockedAt: 1, claimId: 1 },
    };

    const result = await this.outboxModel.updateOne(
      {
        _id: event._id,
        status: OutboxStatus.PROCESSING,
        claimId: event.claimId,
      },
      update,
    );

    return result.matchedCount === 1;
  }

  async getForRecipient(
    recipientId: Types.ObjectId,
    limit = 20,
  ): Promise<NotificationView[]> {
    const documents = await this.notificationModel
      .find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean()
      .exec();

    return documents.map((notification) => ({
      id: notification._id.toString(),
      orderId: notification.orderId.toString(),
      title: notification.title,
      message: notification.message,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }));
  }

  async markRead(
    notificationId: Types.ObjectId,
    recipientId: Types.ObjectId,
  ): Promise<boolean> {
    const filter: FilterQuery<NotificationDocument> = {
      _id: notificationId,
      recipientId,
    };
    const result = await this.notificationModel.updateOne(filter, {
      $set: { readAt: new Date() },
    });

    return result.matchedCount === 1;
  }

  private notificationCopy(status: OrderStatus): {
    title: string;
    message: string;
  } {
    const messages: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Your order has been placed.',
      [OrderStatus.ACCEPTED]: 'The restaurant accepted your order.',
      [OrderStatus.PREPARED]: 'Your order is ready for delivery.',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Your order is out for delivery.',
      [OrderStatus.DELIVERED]: 'Your order was delivered.',
      [OrderStatus.CANCELLED]: 'Your order was cancelled.',
    };

    return {
      title: 'Order update',
      message: messages[status],
    };
  }
}
