import { WsException } from '@nestjs/websockets';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Role } from 'src/application/constants/constants';
import { OrderGateway } from './order.gateway';
import { OrderEventPublisher } from './order-event.publisher';
import { AccessRevocationPublisher } from 'src/infrastructure/auth/access-revocation.publisher';

describe('OrderGateway room authorization', () => {
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
      { isActive: jest.fn().mockResolvedValue(true) } as never,
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
      { isActive: jest.fn().mockResolvedValue(isActive) } as never,
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
    const isActive = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
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
        }),
      } as never,
      { getOrThrow: jest.fn().mockReturnValue('access-secret') } as never,
      new OrderEventPublisher(),
      { isActive } as never,
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
