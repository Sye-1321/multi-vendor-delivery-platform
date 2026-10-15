import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
import { AccountAccessService } from 'src/infrastructure/auth/account-access.service';
import { AccessRevocationPublisher } from 'src/infrastructure/auth/access-revocation.publisher';

interface SocketPrincipal {
  userId: string;
  role: Role;
}

interface OrderSubscriptionRequest {
  orderId: string;
}

const MAX_TIMEOUT_DELAY = 2_147_483_647;

@WebSocketGateway({
  namespace: '/orders',
  transports: ['websocket'],
})
export class OrderGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  private readonly server: Server;

  private eventSubscription?: Subscription;
  private revocationSubscription?: Subscription;
  private readonly expirationTimers = new Map<
    Socket,
    ReturnType<typeof setTimeout>
  >();
  private readonly disconnectedClients = new WeakSet<Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly events: OrderEventPublisher,
    private readonly accountAccess: AccountAccessService,
    private readonly accessRevocations: AccessRevocationPublisher,
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
    this.revocationSubscription = this.accessRevocations.revocations$.subscribe(
      (userId) => {
        try {
          this.server.in(this.userRoomName(userId)).disconnectSockets(true);
        } catch (error) {
          this.logger.warn('order_socket_revocation_failed', {
            userId,
            reason: error instanceof Error ? error.message : 'unknown_error',
          });
        }
      },
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.readAccessToken(client);
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ),
      });
      const expiresAt = this.getExpirationTime(payload);

      const userId = payload.sub?.toString();
      if (!userId || !(await this.accountAccess.resolveActiveUser(userId))) {
        throw new WsException('Authentication is required.');
      }

      await client.join(this.userRoomName(userId));
      const user = await this.accountAccess.resolveActiveUser(userId);
      if (!user) {
        throw new WsException('Authentication is required.');
      }
      if (this.disconnectedClients.has(client) || expiresAt <= Date.now()) {
        throw new WsException('Authentication is required.');
      }

      client.data.principal = {
        userId,
        role: user.role,
      } satisfies SocketPrincipal;
      this.scheduleExpiration(client, expiresAt);
    } catch (error) {
      this.logger.warn('order_socket_authentication_rejected', {
        socketId: client.id,
        reason: error instanceof Error ? error.name : 'invalid_token',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.disconnectedClients.add(client);
    this.clearExpirationTimer(client);
    delete client.data.principal;
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
    const user = await this.accountAccess.resolveActiveUser(principal.userId);
    if (!user) {
      client.disconnect(true);
      throw new WsException('Authentication is required.');
    }
    principal.role = user.role;

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

    const room = this.roomName(request.orderId);
    await client.join(room);

    try {
      const refreshedResult = await this.orderRepository.getOrderById(
        new Types.ObjectId(request.orderId),
      );
      if (!refreshedResult.isSuccess) {
        throw new WsException('Order is unavailable.');
      }

      const refreshedOrder = refreshedResult.getValue();
      if (!(await this.canObserveOrder(principal, refreshedOrder))) {
        throw new WsException('Order is unavailable.');
      }

      return {
        event: 'order:subscribed',
        data: OrderParser.createOrderResponse(refreshedOrder),
      };
    } catch {
      try {
        await client.leave(room);
      } catch (leaveError) {
        this.logger.warn('order_socket_room_cleanup_failed', {
          socketId: client.id,
          orderId: request.orderId,
          reason:
            leaveError instanceof Error ? leaveError.message : 'unknown_error',
        });
      }
      throw new WsException('Order is unavailable.');
    }
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
    this.revocationSubscription?.unsubscribe();
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
  }

  private getExpirationTime(payload: IJwtPayload): number {
    const expiresAt =
      typeof payload.exp === 'number' ? payload.exp * 1000 : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new WsException('Authentication is required.');
    }
    return expiresAt;
  }

  private scheduleExpiration(client: Socket, expiresAt: number): void {
    this.clearExpirationTimer(client);
    const remainingTime = expiresAt - Date.now();
    if (!Number.isFinite(expiresAt) || remainingTime <= 0) {
      delete client.data.principal;
      client.disconnect(true);
      return;
    }

    const timer = setTimeout(
      () => {
        this.expirationTimers.delete(client);
        if (!this.disconnectedClients.has(client)) {
          this.scheduleExpiration(client, expiresAt);
        }
      },
      Math.min(remainingTime, MAX_TIMEOUT_DELAY),
    );
    timer.unref();
    this.expirationTimers.set(client, timer);
  }

  private clearExpirationTimer(client: Socket): void {
    const timer = this.expirationTimers.get(client);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(client);
    }
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

  private userRoomName(userId: string): string {
    return `user:${userId}`;
  }
}
