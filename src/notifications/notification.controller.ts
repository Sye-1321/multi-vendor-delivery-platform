import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from 'src/application/constants/types';
import { Result } from 'src/domain/result/result';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import {
  NotificationOutboxService,
  NotificationView,
} from './notification-outbox.service';
import { NotificationQueryDTO } from 'src/shared/dtos/notification-query.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiResultResponse,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';
import {
  NotificationReadSchema,
  NotificationSchema,
} from 'src/infrastructure/swagger/swagger.schemas';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(AccessAuthGuard)
export class NotificationController {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    private readonly notifications: NotificationOutboxService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResultResponse(HttpStatus.OK, { model: NotificationSchema, array: true })
  async getNotifications(
    @Query() query: NotificationQueryDTO,
  ): Promise<Result<NotificationView[]>> {
    const recipientId = this.getRecipientId();
    return Result.ok(
      await this.notifications.getForRecipient(recipientId, {
        limit: query.limit,
        before: query.before ? new Types.ObjectId(query.before) : undefined,
      }),
    );
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResultResponse(HttpStatus.OK, { model: NotificationReadSchema })
  @mongoIdParam('notificationId')
  async markRead(
    @Param('notificationId', ParseObjectIdPipe) notificationId: Types.ObjectId,
  ): Promise<Result<{ read: true }>> {
    const updated = await this.notifications.markRead(
      notificationId,
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
