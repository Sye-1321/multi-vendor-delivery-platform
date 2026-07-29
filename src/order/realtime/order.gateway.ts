import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { Types } from 'mongoose';
import { TYPES } from 'src/application/constants/types';
import { Role } from 'src/application/constants/constants';
import { IJwtPayload } from 'src/infrastructure/auth/interfaces/auth.interface';
import { IOrderRepository } from 'src/infrastructure/data_access/repositories/interfaces/order-repository';
import { IRestaurantRepository } from 'src/infrastructure/data_access/repositories/interfaces/restaurant-repository.interface';
import { StructuredLogger } from 'src/infrastructure/logger/structured-logger.service';
import { OrderParser } from '../order.parser';
import { OrderEventPublisher } from './order-event.publisher';

interface SocketPrincipal {
  userId: string;
  role: Role;
}

interface OrderSubscriptionRequest {
  orderId: string;
}

@WebSocketGateway({
  namespace: '/orders',
  transports: ['websocket'],
})
export class OrderGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  private readonly server: Server;

  private eventSubscription?: Subscription;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly events: OrderEventPublisher,
    private readonly logger: StructuredLogger,
    @Inject(TYPES.IOrderRepository)
    private readonly orderRepository: IOrderRepository,
    @Inject(TYPES.IRestaurantRepository)
    private readonly restaurantRepository: IRestaurantRepository,
  ) {}

  afterInit(): void {
    this.eventSubscription = this.events.events$.subscribe((event) => {
      this.server.to(this.roomName(event.orderId)).emit('order:updated', event);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.readAccessToken(client);
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ),
      });

      client.data.principal = {
        userId: payload.sub.toString(),
        role: payload.role,
      } satisfies SocketPrincipal;
    } catch (error) {
      this.logger.warn('order_socket_authentication_rejected', {
        socketId: client.id,
        reason: error instanceof Error ? error.name : 'invalid_token',
      });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('order:subscribe')
  async subscribeToOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: OrderSubscriptionRequest,
  ) {
    if (!Types.ObjectId.isValid(request?.orderId)) {
      throw new WsException('Order is unavailable.');
    }

    const principal = client.data.principal as SocketPrincipal | undefined;
    if (!principal) {
      throw new WsException('Authentication is required.');
    }

    const orderResult = await this.orderRepository.getOrderById(
      new Types.ObjectId(request.orderId),
    );
    if (!orderResult.isSuccess) {
      throw new WsException('Order is unavailable.');
    }

    const order = orderResult.getValue();
    if (!(await this.canObserveOrder(principal, order))) {
      this.logger.warn('order_socket_subscription_rejected', {
        socketId: client.id,
        actorId: principal.userId,
        actorRole: principal.role,
        orderId: request.orderId,
      });
      throw new WsException('Order is unavailable.');
    }

    await client.join(this.roomName(request.orderId));
    return {
      event: 'order:subscribed',
      data: OrderParser.createOrderResponse(order),
    };
  }

  @SubscribeMessage('order:unsubscribe')
  async unsubscribeFromOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: OrderSubscriptionRequest,
  ): Promise<void> {
    if (Types.ObjectId.isValid(request?.orderId)) {
      await client.leave(this.roomName(request.orderId));
    }
  }

  onModuleDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }

  private async canObserveOrder(
    principal: SocketPrincipal,
    order: {
      userId: Types.ObjectId;
      restaurantId: Types.ObjectId;
    },
  ): Promise<boolean> {
    if (
      principal.role === Role.SYSTEM_ADMINISTRATOR ||
      principal.role === Role.DELIVERY_COMPANY_ADMINISTRATOR
    ) {
      return true;
    }

    if (principal.role === Role.END_USER) {
      return order.userId.toString() === principal.userId;
    }

    if (principal.role !== Role.RESTAURANT_ADMINISTRATOR) {
      return false;
    }

    return this.restaurantRepository.isRestaurantAdmin(
      order.restaurantId,
      new Types.ObjectId(principal.userId),
    );
  }

  private readAccessToken(client: Socket): string {
    const handshakeToken = client.handshake.auth?.token;
    if (typeof handshakeToken === 'string' && handshakeToken.length > 0) {
      return handshakeToken;
    }

    const authorization = client.handshake.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }

    throw new WsException('Authentication is required.');
  }

  private roomName(orderId: string): string {
    return `order:${orderId}`;
  }
}
