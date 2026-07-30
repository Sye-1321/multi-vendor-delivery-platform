import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from 'src/order/constants/constants';

export enum OutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  DEAD_LETTER = 'dead_letter',
}

export interface OrderStatusNotificationPayload {
  recipientId: string;
  orderId: string;
  status: OrderStatus;
}

@Schema({ versionKey: false, timestamps: true })
export class NotificationOutboxDataModel {
  @Prop({ type: String, required: true, unique: true })
  deduplicationKey: string;

  @Prop({ type: String, required: true })
  eventType: 'order.status_changed';

  @Prop({ type: Types.ObjectId, required: true })
  aggregateId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  payload: OrderStatusNotificationPayload;

  @Prop({
    type: String,
    enum: Object.values(OutboxStatus),
    default: OutboxStatus.PENDING,
    required: true,
  })
  status: OutboxStatus;

  @Prop({ type: Number, default: 0, required: true })
  attempts: number;

  @Prop({ type: Date, default: Date.now, required: true })
  nextAttemptAt: Date;

  @Prop({ type: Date })
  lockedAt?: Date;

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: String })
  correlationId?: string;

  @Prop({ type: String })
  lastError?: string;
}

export type NotificationOutboxDocument =
  HydratedDocument<NotificationOutboxDataModel>;
export const NotificationOutboxSchema = SchemaFactory.createForClass(
  NotificationOutboxDataModel,
);

NotificationOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
NotificationOutboxSchema.index({ status: 1, lockedAt: 1 });

@Schema({ versionKey: false, timestamps: true })
export class NotificationDataModel {
  @Prop({ type: Types.ObjectId, required: true, ref: 'UserDataModel' })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'OrderDataModel' })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true, unique: true })
  sourceEventKey: string;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<NotificationDataModel>;
export const NotificationSchema = SchemaFactory.createForClass(
  NotificationDataModel,
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
