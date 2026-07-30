import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { StructuredLogger } from 'src/infrastructure/logger/structured-logger.service';
import { NotificationOutboxService } from './notification-outbox.service';

@Injectable()
export class NotificationProcessor
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly outbox: NotificationOutboxService,
    private readonly logger: StructuredLogger,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.processNext(), 1_000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      const event = await this.outbox.claimNext();
      if (!event) {
        return;
      }

      try {
        await this.outbox.deliver(event);
        this.logger.info('notification_outbox_delivered', {
          eventId: event.id,
          eventType: event.eventType,
          aggregateId: event.aggregateId.toString(),
          correlationId: event.correlationId,
          attempts: event.attempts,
        });
      } catch (error) {
        await this.outbox.reschedule(event, error);
        this.logger.warn('notification_outbox_delivery_failed', {
          eventId: event.id,
          eventType: event.eventType,
          aggregateId: event.aggregateId.toString(),
          correlationId: event.correlationId,
          attempts: event.attempts,
        });
      }
    } catch (error) {
      this.logger.error('notification_outbox_poll_failed', error);
    } finally {
      this.processing = false;
    }
  }
}
