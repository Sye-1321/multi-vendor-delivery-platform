import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationOutboxService } from './notification-outbox.service';
import { NotificationProcessor } from './notification.processor';
import {
  NotificationDataModel,
  NotificationOutboxDataModel,
  NotificationOutboxSchema,
  NotificationSchema,
} from './notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NotificationOutboxDataModel.name,
        schema: NotificationOutboxSchema,
      },
      {
        name: NotificationDataModel.name,
        schema: NotificationSchema,
      },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationOutboxService, NotificationProcessor],
  exports: [NotificationOutboxService],
})
export class NotificationModule {}
