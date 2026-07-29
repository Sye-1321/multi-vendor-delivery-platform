import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { OrderStatus, PaymentStatus } from '../constants/constants';
import { IOrderTimelineEntryDTO } from '../dtos/order-response.dto';
import { Order } from '../order';

export interface OrderRealtimeEvent {
  orderId: string;
  userId: string;
  restaurantId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  transition: IOrderTimelineEntryDTO;
  correlationId?: string;
}

@Injectable()
export class OrderEventPublisher {
  private readonly subject = new Subject<OrderRealtimeEvent>();

  readonly events$ = this.subject.asObservable();

  publish(order: Order, correlationId?: string): void {
    const transition = order.timeline.at(-1);
    if (!transition) {
      return;
    }

    this.subject.next({
      orderId: order.id.toString(),
      userId: order.userId.toString(),
      restaurantId: order.restaurantId.toString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      transition: {
        from: transition.from,
        to: transition.to,
        actorRole: transition.actorRole,
        occurredAt: transition.occurredAt,
      },
      correlationId,
    });
  }
}
