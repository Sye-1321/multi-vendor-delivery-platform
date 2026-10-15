import { WsException } from '@nestjs/websockets';
import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Role } from 'src/application/constants/constants';
import { OrderGateway } from './order.gateway';
import { OrderEventPublisher } from './order-event.publisher';
import { AccessRevocationPublisher } from 'src/infrastructure/auth/access-revocation.publisher';
import { Subject } from 'rxjs';
import { OrderRealtimeEvent } from './order-event.publisher';
import { OrderStatus, PaymentStatus } from '../constants/constants';

describe('OrderGateway room authorization', () => {
  const observableOrder = (
    orderId: Types.ObjectId,
    overrides: Record<string, unknown> = {},
  ) => ({
    id: orderId,
    userId: new Types.ObjectId(),
    restaurantId: new Types.ObjectId(),
    cart: {
      id: new Types.ObjectId(),
      totalPrice: 100,
      cartItems: [],
    },
    deliveryAddress: { city: 'Addis Ababa', subCity: 'Bole' },
    status: 'pending',
    totalPrice: 100,
    paymentStatus: 'pending',
    timeline: [],
    deliveryPersonId: null,
    deliveryPerson: undefined,
    audit: {
      auditCreatedBy: 'test@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    },
    ...overrides,
  });

  it('does not reveal or join another customer order', async () => {
    const orderId = new Types.ObjectId();
    const orderRepository = {
      getOrderById: jest.fn().mockResolvedValue(
        Result.ok({
          userId: new Types.ObjectId(),
          restaurantId: new Types.ObjectId(),
        }),
      ),
    };
    const client = {
      data: {
        principal: {
          userId: new Types.ObjectId().toString(),
          role: Role.END_USER,
        },
      },
      join: jest.fn(),
    };
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      {} as never,
      {
        resolveActiveUser: jest.fn().mockResolvedValue({ role: Role.END_USER }),
      } as never,
      {} as never,
      { warn: jest.fn() } as never,
      orderRepository as never,
      {} as never,
    );

    await expect(
      gateway.subscribeToOrder(client as never, {
        orderId: orderId.toString(),
      }),
    ).rejects.toBeInstanceOf(WsException);
    expect(client.join).not.toHaveBeenCalled();
    expect(orderRepository.getOrderById).toHaveBeenCalledTimes(1);
  });

  it('uses the persisted role when authorizing a subscription', async () => {
    const orderId = new Types.ObjectId();
    const order = observableOrder(orderId);
    const orderRepository = {
      getOrderById: jest.fn().mockResolvedValue(Result.ok(order)),
    };
    const principal = {
      userId: new Types.ObjectId().toString(),
      role: Role.END_USER,
    };
    const client = {
      data: { principal },
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
    };
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      {} as never,
      {
        resolveActiveUser: jest
          .fn()
          .mockResolvedValue({ role: Role.SYSTEM_ADMINISTRATOR }),
      } as never,
      {} as never,
      { warn: jest.fn() } as never,
      orderRepository as never,
      {} as never,
    );

    await expect(
      gateway.subscribeToOrder(client as never, {
        orderId: orderId.toString(),
      }),
    ).resolves.toMatchObject({ event: 'order:subscribed' });
    expect(principal.role).toBe(Role.SYSTEM_ADMINISTRATOR);
    expect(client.join).toHaveBeenCalledWith(`order:${orderId}`);
    expect(orderRepository.getOrderById).toHaveBeenCalledTimes(2);
  });

  it('joins before rereading and acknowledges the refreshed order', async () => {
    const orderId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const pending = observableOrder(orderId, { userId });
    const accepted = observableOrder(orderId, {
      userId,
      status: 'accepted',
      timeline: [
        {
          from: 'pending',
          to: 'accepted',
          actorRole: Role.RESTAURANT_ADMINISTRATOR,
          occurredAt: new Date().toISOString(),
        },
      ],
    });
    const getOrderById = jest
      .fn()
      .mockResolvedValueOnce(Result.ok(pending))
      .mockResolvedValueOnce(Result.ok(accepted));
    const client = {
      data: { principal: { userId: userId.toString(), role: Role.END_USER } },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn(),
    };
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      {} as never,
      {
        resolveActiveUser: jest.fn().mockResolvedValue({ role: Role.END_USER }),
      } as never,
      {} as never,
      { warn: jest.fn() } as never,
      { getOrderById } as never,
      {} as never,
    );

    const response = await gateway.subscribeToOrder(client as never, {
      orderId: orderId.toString(),
    });

    expect(getOrderById).toHaveBeenCalledTimes(2);
    expect(getOrderById.mock.invocationCallOrder[0]).toBeLessThan(
      client.join.mock.invocationCallOrder[0],
    );
    expect(client.join.mock.invocationCallOrder[0]).toBeLessThan(
      getOrderById.mock.invocationCallOrder[1],
    );
    expect(response).toMatchObject({
      event: 'order:subscribed',
      data: { status: 'accepted', timeline: [{ to: 'accepted' }] },
    });
  });

  it.each([
    [
      'failed refreshed read',
      () => Result.fail('database unavailable', HttpStatus.NOT_FOUND),
    ],
    [
      'thrown refreshed read',
      () => Promise.reject(new Error('database unavailable')),
    ],
  ])('leaves the room after a %s', async (_, refreshed) => {
    const orderId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const order = observableOrder(orderId, { userId });
    const getOrderById = jest
      .fn()
      .mockResolvedValueOnce(Result.ok(order))
      .mockImplementationOnce(refreshed);
    const client = {
      data: { principal: { userId: userId.toString(), role: Role.END_USER } },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      {} as never,
      {
        resolveActiveUser: jest.fn().mockResolvedValue({ role: Role.END_USER }),
      } as never,
      {} as never,
      { warn: jest.fn() } as never,
      { getOrderById } as never,
      {} as never,
    );

    await expect(
      gateway.subscribeToOrder(client as never, {
        orderId: orderId.toString(),
      }),
    ).rejects.toMatchObject({ message: 'Order is unavailable.' });
    expect(client.leave).toHaveBeenCalledWith(`order:${orderId}`);
  });

  it('leaves when the refreshed order is no longer observable', async () => {
    const orderId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const first = observableOrder(orderId, { userId });
    const refreshed = observableOrder(orderId, {
      userId: new Types.ObjectId(),
    });
    const client = {
      data: { principal: { userId: userId.toString(), role: Role.END_USER } },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      {} as never,
      {
        resolveActiveUser: jest.fn().mockResolvedValue({ role: Role.END_USER }),
      } as never,
      {} as never,
      { warn: jest.fn() } as never,
      {
        getOrderById: jest
          .fn()
          .mockResolvedValueOnce(Result.ok(first))
          .mockResolvedValueOnce(Result.ok(refreshed)),
      } as never,
      {} as never,
    );

    await expect(
      gateway.subscribeToOrder(client as never, {
        orderId: orderId.toString(),
      }),
    ).rejects.toMatchObject({ message: 'Order is unavailable.' });
    expect(client.leave).toHaveBeenCalledWith(`order:${orderId}`);
  });
});

describe('OrderGateway account revocation', () => {
  const createGateway = (isActive: boolean) => {
    const revocations = new AccessRevocationPublisher();
    const disconnectSockets = jest.fn();
    const logger = { warn: jest.fn() };
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      new OrderEventPublisher(),
      {
        resolveActiveUser: jest
          .fn()
          .mockResolvedValue(isActive ? { role: Role.END_USER } : undefined),
      } as never,
      revocations,
      logger as never,
      {} as never,
      {} as never,
    );
    (gateway as unknown as { server: unknown }).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      in: jest.fn().mockReturnValue({ disconnectSockets }),
    };
    gateway.afterInit();
    return { gateway, revocations, disconnectSockets, logger };
  };

  it('disconnects sockets in the revoked user room', () => {
    const { gateway, revocations, disconnectSockets } = createGateway(true);
    const userId = new Types.ObjectId().toString();

    revocations.publish(userId);

    expect(disconnectSockets).toHaveBeenCalledWith(true);
    gateway.onModuleDestroy();
  });

  it('rejects the subscribe race when the connected user is no longer ACTIVE', async () => {
    const { gateway } = createGateway(false);
    const client = {
      data: {
        principal: {
          userId: new Types.ObjectId().toString(),
          role: Role.END_USER,
        },
      },
      join: jest.fn(),
      disconnect: jest.fn(),
    };

    await expect(
      gateway.subscribeToOrder(client as never, {
        orderId: new Types.ObjectId().toString(),
      }),
    ).rejects.toBeInstanceOf(WsException);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    gateway.onModuleDestroy();
  });

  it('disconnects without establishing a principal when suspension lands during handshake', async () => {
    const userId = new Types.ObjectId().toString();
    const resolveActiveUser = jest
      .fn()
      .mockResolvedValueOnce({ role: Role.END_USER })
      .mockResolvedValueOnce(undefined);
    const client = {
      id: 'racing-socket',
      handshake: { auth: { token: 'signed-access-token' }, headers: {} },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };
    const gateway = new OrderGateway(
      {
        verifyAsync: jest.fn().mockResolvedValue({
          sub: userId,
          role: Role.END_USER,
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) + 60,
        }),
      } as never,
      { getOrThrow: jest.fn().mockReturnValue('access-secret') } as never,
      new OrderEventPublisher(),
      { resolveActiveUser } as never,
      new AccessRevocationPublisher(),
      { warn: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await gateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith(`user:${userId}`);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.data).not.toHaveProperty('principal');
  });

  it('contains and logs realtime cleanup failure', () => {
    const { gateway, revocations, disconnectSockets, logger } =
      createGateway(true);
    const userId = new Types.ObjectId().toString();
    disconnectSockets.mockImplementation(() => {
      throw new Error('adapter failure');
    });

    expect(() => revocations.publish(userId)).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith('order_socket_revocation_failed', {
      userId,
      reason: 'adapter failure',
    });
    gateway.onModuleDestroy();
  });
});

describe('OrderGateway access-token expiration', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  function build(payload: Record<string, unknown>) {
    const gateway = new OrderGateway(
      { verifyAsync: jest.fn().mockResolvedValue(payload) } as never,
      { getOrThrow: jest.fn().mockReturnValue('access-secret') } as never,
      new OrderEventPublisher(),
      {
        resolveActiveUser: jest.fn().mockResolvedValue({ role: Role.END_USER }),
      } as never,
      new AccessRevocationPublisher(),
      { warn: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    const client = {
      id: 'authenticated-socket',
      handshake: { auth: { token: 'signed-access-token' }, headers: {} },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };
    return { gateway, client };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('disconnects an authenticated socket when its access token expires', async () => {
    const userId = new Types.ObjectId().toString();
    const { gateway, client } = build({
      sub: userId,
      role: Role.END_USER,
      email: 'user@example.com',
      exp: Math.floor(now.getTime() / 1000) + 10,
    });

    await gateway.handleConnection(client as never);
    expect(client.data).toHaveProperty('principal.userId', userId);

    jest.advanceTimersByTime(10_000);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.data).not.toHaveProperty('principal');
  });

  it('keeps a socket connected until an expiration beyond the maximum timer delay', async () => {
    const lifetime = 30 * 24 * 60 * 60 * 1000;
    const maximumTimerDelay = 2_147_483_647;
    const { gateway, client } = build({
      sub: new Types.ObjectId().toString(),
      role: Role.END_USER,
      email: 'user@example.com',
      exp: Math.floor((now.getTime() + lifetime) / 1000),
    });

    await gateway.handleConnection(client as never);

    jest.advanceTimersByTime(maximumTimerDelay);
    expect(client.disconnect).not.toHaveBeenCalled();

    jest.advanceTimersByTime(lifetime - maximumTimerDelay - 1);
    expect(client.disconnect).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.data).not.toHaveProperty('principal');
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'later'],
    ['expired', Math.floor(now.getTime() / 1000)],
  ])('rejects a token with %s expiration metadata', async (_, exp) => {
    const { gateway, client } = build({
      sub: new Types.ObjectId().toString(),
      role: Role.END_USER,
      email: 'user@example.com',
      exp,
    });

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(client.data).not.toHaveProperty('principal');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears the expiration timer when the socket disconnects early', async () => {
    const { gateway, client } = build({
      sub: new Types.ObjectId().toString(),
      role: Role.END_USER,
      email: 'user@example.com',
      exp: Math.floor(now.getTime() / 1000) + 60,
    });

    await gateway.handleConnection(client as never);
    expect(jest.getTimerCount()).toBe(1);

    gateway.handleDisconnect(client as never);

    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(60_000);
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data).not.toHaveProperty('principal');
  });

  it('does not authenticate a socket that disconnects during the handshake', async () => {
    const { gateway, client } = build({
      sub: new Types.ObjectId().toString(),
      role: Role.END_USER,
      email: 'user@example.com',
      exp: Math.floor(now.getTime() / 1000) + 60,
    });
    client.join.mockImplementation(() => {
      gateway.handleDisconnect(client as never);
      return Promise.resolve();
    });

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.data).not.toHaveProperty('principal');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('authenticates a new connection with a fresh access token', async () => {
    const userId = new Types.ObjectId().toString();
    const expired = build({
      sub: userId,
      role: Role.END_USER,
      email: 'user@example.com',
      exp: Math.floor(now.getTime() / 1000),
    });
    await expired.gateway.handleConnection(expired.client as never);

    const fresh = build({
      sub: userId,
      role: Role.END_USER,
      email: 'user@example.com',
      exp: Math.floor(now.getTime() / 1000) + 60,
    });
    await fresh.gateway.handleConnection(fresh.client as never);

    expect(fresh.client.disconnect).not.toHaveBeenCalled();
    expect(fresh.client.join).toHaveBeenCalledWith(`user:${userId}`);
    expect(fresh.client.data).toHaveProperty('principal.userId', userId);
    fresh.gateway.handleDisconnect(fresh.client as never);
  });
});

describe('OrderGateway event forwarding', () => {
  it('emits published updates only to the order room', () => {
    const events = new Subject<OrderRealtimeEvent>();
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const gateway = new OrderGateway(
      {} as never,
      {} as never,
      { events$: events.asObservable() } as never,
      {} as never,
      new AccessRevocationPublisher(),
      { warn: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    (gateway as unknown as { server: unknown }).server = {
      to,
      in: jest.fn().mockReturnValue({ disconnectSockets: jest.fn() }),
    };
    gateway.afterInit();
    const event: OrderRealtimeEvent = {
      orderId: new Types.ObjectId().toString(),
      userId: new Types.ObjectId().toString(),
      restaurantId: new Types.ObjectId().toString(),
      status: OrderStatus.ACCEPTED,
      paymentStatus: PaymentStatus.PENDING,
      transition: {
        from: OrderStatus.PENDING,
        to: OrderStatus.ACCEPTED,
        actorRole: Role.RESTAURANT_ADMINISTRATOR,
        occurredAt: new Date().toISOString(),
      },
    };

    events.next(event);

    expect(to).toHaveBeenCalledWith(`order:${event.orderId}`);
    expect(emit).toHaveBeenCalledWith('order:updated', event);
    gateway.onModuleDestroy();
  });
});
