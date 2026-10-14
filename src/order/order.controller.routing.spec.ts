import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import request from 'supertest';
import { TYPES } from 'src/application/constants/types';
import { Result } from 'src/domain/result/result';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { OrderController } from './order.controller';

describe('OrderController routing', () => {
  let app: INestApplication;
  const orderService = {
    assignDeliveryPerson: jest.fn(),
    createOrder: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: TYPES.IOrderService,
          useValue: orderService,
        },
      ],
    })
      .overrideGuard(AccessAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('converts both assignment route ids before calling the service', async () => {
    const orderId = '507f1f77bcf86cd799439011';
    const deliveryPersonId = '507f191e810c19729de860ea';
    orderService.assignDeliveryPerson.mockResolvedValue(Result.ok({}));

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/assign-delivery-person/${deliveryPersonId}`)
      .expect(200);

    expect(orderService.assignDeliveryPerson).toHaveBeenCalledTimes(1);
    const [receivedOrderId, receivedDeliveryPersonId] =
      orderService.assignDeliveryPerson.mock.calls[0];
    expect(receivedOrderId).toBeInstanceOf(Types.ObjectId);
    expect(receivedOrderId.toString()).toBe(orderId);
    expect(receivedDeliveryPersonId).toBeInstanceOf(Types.ObjectId);
    expect(receivedDeliveryPersonId.toString()).toBe(deliveryPersonId);
  });

  it.each([
    ['order id', 'invalid', '507f191e810c19729de860ea'],
    ['delivery-person id', '507f1f77bcf86cd799439011', 'invalid'],
  ])(
    'rejects an invalid %s before calling the service',
    async (_, orderId, deliveryPersonId) => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/assign-delivery-person/${deliveryPersonId}`)
        .expect(400);

      expect(orderService.assignDeliveryPerson).not.toHaveBeenCalled();
    },
  );

  it('forwards a trimmed checkout idempotency key', async () => {
    const restaurantId = '507f1f77bcf86cd799439011';
    const body = {
      cart: {
        cartItems: [{ menuItemId: '507f191e810c19729de860ea', quantity: 1 }],
      },
      deliveryAddress: { city: 'Addis Ababa', subCity: 'Bole' },
    };
    orderService.createOrder.mockResolvedValue(Result.ok({}));

    await request(app.getHttpServer())
      .post(`/orders/${restaurantId}`)
      .set('Idempotency-Key', ' checkout-1 ')
      .send(body)
      .expect(201);

    expect(orderService.createOrder).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
      body,
      'checkout-1',
    );
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
    ['overlong', 'x'.repeat(129)],
  ])('rejects a %s checkout idempotency key', async (_, key) => {
    const call = request(app.getHttpServer()).post(
      '/orders/507f1f77bcf86cd799439011',
    );
    if (key !== undefined) call.set('Idempotency-Key', key);

    await call.send({}).expect(400);
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });
});
