import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from 'src/application/constants/types';
import { Result } from 'src/domain/result/result';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';
import {
  NotificationOutboxService,
  NotificationView,
} from './notification-outbox.service';

@Controller('notifications')
@UseGuards(AccessAuthGuard)
export class NotificationController {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    private readonly notifications: NotificationOutboxService,
  ) {}

  @Get()
  async getNotifications(): Promise<Result<NotificationView[]>> {
    const recipientId = this.getRecipientId();
    return Result.ok(await this.notifications.getForRecipient(recipientId));
  }

  @Patch(':notificationId/read')
  async markRead(
    @Param('notificationId') notificationId: string,
  ): Promise<Result<{ read: true }>> {
    if (!Types.ObjectId.isValid(notificationId)) {
      return throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Invalid notification ID.',
      );
    }

    const updated = await this.notifications.markRead(
      new Types.ObjectId(notificationId),
      this.getRecipientId(),
    );
    if (!updated) {
      return throwApplicationError(
        HttpStatus.NOT_FOUND,
        'Notification not found.',
      );
    }

    return Result.ok({ read: true });
  }

  private getRecipientId(): Types.ObjectId {
    const userId = this.contextService.getContext().userId;
    if (!userId) {
      return throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'Authentication is required.',
      );
    }

    return new Types.ObjectId(userId);
  }
}
