import { WsException } from '@nestjs/websockets';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Role } from 'src/application/constants/constants';
import { OrderGateway } from './order.gateway';

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
