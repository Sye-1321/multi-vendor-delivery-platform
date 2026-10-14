import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { RestaurantStatus } from 'src/restaurant/constants/constants';
import { CreateOrderDTO } from './dtos/order.dto';
import { OrderService } from './order.service';
import { createHash } from 'node:crypto';

describe('OrderService checkout restaurant state', () => {
  const restaurantId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const orderData = {
    cart: {
      cartItems: [
        {
          menuItemId: new Types.ObjectId().toString(),
          quantity: 1,
        },
      ],
    },
    deliveryAddress: { city: 'Addis Ababa', subCity: 'Bole' },
  } as CreateOrderDTO;

  function buildService(status: RestaurantStatus | null) {
    const context = new Context('customer@example.com', 'correlation-id');
    context.setPrincipal({
      userId: userId.toString(),
      email: 'customer@example.com',
      role: Role.END_USER,
    });
    const session = {
      withTransaction: jest.fn((work: () => Promise<unknown>) => work()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const restaurantRepository = {
      getStatusById: jest.fn().mockResolvedValue(status),
    };
    const menuItemRepository = {
      getAvailableMenuItemsByIds: jest.fn().mockResolvedValue(Result.ok([])),
    };
    const cartItemRepository = { insertManyWithSession: jest.fn() };
    const cartRepository = { create: jest.fn() };
    const orderRepository = {
      getOrderByIdempotencyKey: jest
        .fn()
        .mockResolvedValue(Result.fail('', HttpStatus.NOT_FOUND)),
      startSession: jest.fn().mockResolvedValue(session),
      createOrder: jest.fn(),
    };
    const notificationOutbox = { enqueueOrderStatusChange: jest.fn() };
    const orderEvents = { publish: jest.fn() };
    const service = new OrderService(
      { getContext: () => context } as never,
      { getContextUser: () => Promise.resolve({ id: userId }) } as never,
      {} as never,
      restaurantRepository as never,
      orderRepository as never,
      {} as never,
      menuItemRepository as never,
      { toPersistence: jest.fn() } as never,
      cartItemRepository as never,
      { toPersistence: jest.fn() } as never,
      cartRepository as never,
      { toPersistence: jest.fn() } as never,
      orderEvents as never,
      notificationOutbox as never,
    );

    return {
      service,
      session,
      restaurantRepository,
      menuItemRepository,
      cartItemRepository,
      cartRepository,
      orderRepository,
      notificationOutbox,
      orderEvents,
    };
  }

  function fingerprint(data: CreateOrderDTO): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          restaurantId: restaurantId.toString(),
          deliveryAddress: {
            city: data.deliveryAddress.city,
            subCity: data.deliveryAddress.subCity,
          },
          cartItems: data.cart.cartItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            customizations: item.customizations ?? null,
          })),
        }),
      )
      .digest('hex');
  }

  function persistedOrder(data: CreateOrderDTO) {
    return {
      id: new Types.ObjectId(),
      userId,
      restaurantId,
      cart: { id: new Types.ObjectId(), totalPrice: 10, cartItems: [] },
      deliveryAddress: data.deliveryAddress,
      status: 'pending',
      paymentStatus: 'pending',
      totalPrice: 10,
      timeline: [],
      deliveryPersonId: null,
      deliveryPerson: null,
      audit: {
        auditCreatedBy: 'customer@example.com',
        auditCreatedDateTime: new Date().toISOString(),
      },
      idempotencyKey: 'retry-key',
      idempotencyFingerprint: fingerprint(data),
    };
  }

  function expectNoCheckoutSideEffects(
    dependencies: ReturnType<typeof buildService>,
  ) {
    expect(
      dependencies.menuItemRepository.getAvailableMenuItemsByIds,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.cartItemRepository.insertManyWithSession,
    ).not.toHaveBeenCalled();
    expect(dependencies.cartRepository.create).not.toHaveBeenCalled();
    expect(dependencies.orderRepository.createOrder).not.toHaveBeenCalled();
    expect(
      dependencies.notificationOutbox.enqueueOrderStatusChange,
    ).not.toHaveBeenCalled();
    expect(dependencies.orderEvents.publish).not.toHaveBeenCalled();
  }

  it('rejects an unknown restaurant before menu lookup or writes', async () => {
    const dependencies = buildService(null);

    await expect(
      dependencies.service.createOrder(restaurantId, orderData, 'unknown'),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: {
        status: HttpStatus.NOT_FOUND,
        error: 'Restaurant not found',
      },
    });

    expect(
      dependencies.restaurantRepository.getStatusById,
    ).toHaveBeenCalledWith(restaurantId, { session: dependencies.session });
    expectNoCheckoutSideEffects(dependencies);
    expect(dependencies.session.endSession).toHaveBeenCalledTimes(1);
  });

  it('rejects an inactive restaurant before menu lookup or writes', async () => {
    const dependencies = buildService(RestaurantStatus.INACTIVE);

    await expect(
      dependencies.service.createOrder(restaurantId, orderData, 'inactive'),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: {
        status: HttpStatus.CONFLICT,
        error: 'Restaurant is not accepting orders',
      },
    });

    expect(
      dependencies.restaurantRepository.getStatusById,
    ).toHaveBeenCalledWith(restaurantId, { session: dependencies.session });
    expectNoCheckoutSideEffects(dependencies);
    expect(dependencies.session.endSession).toHaveBeenCalledTimes(1);
  });

  it('allows an active restaurant to proceed to menu-item validation', async () => {
    const dependencies = buildService(RestaurantStatus.ACTIVE);

    await expect(
      dependencies.service.createOrder(restaurantId, orderData, 'active'),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });

    expect(
      dependencies.restaurantRepository.getStatusById,
    ).toHaveBeenCalledWith(restaurantId, { session: dependencies.session });
    expect(
      dependencies.menuItemRepository.getAvailableMenuItemsByIds,
    ).toHaveBeenCalledWith(restaurantId, [expect.any(Types.ObjectId)], {
      session: dependencies.session,
    });
    expect(
      dependencies.restaurantRepository.getStatusById.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      dependencies.menuItemRepository.getAvailableMenuItemsByIds.mock
        .invocationCallOrder[0],
    );
    expect(dependencies.session.endSession).toHaveBeenCalledTimes(1);
  });

  it('returns a matching persisted checkout before opening a session', async () => {
    const dependencies = buildService(RestaurantStatus.ACTIVE);
    const order = persistedOrder(orderData);
    dependencies.orderRepository.getOrderByIdempotencyKey.mockResolvedValue(
      Result.ok(order),
    );

    const result = await dependencies.service.createOrder(
      restaurantId,
      orderData,
      'retry-key',
    );

    expect(result.getValue().id).toEqual(order.id);
    expect(dependencies.orderRepository.startSession).not.toHaveBeenCalled();
    expect(
      dependencies.restaurantRepository.getStatusById,
    ).not.toHaveBeenCalled();
    expectNoCheckoutSideEffects(dependencies);
  });

  it('rejects a reused key with a different request before side effects', async () => {
    const dependencies = buildService(RestaurantStatus.ACTIVE);
    dependencies.orderRepository.getOrderByIdempotencyKey.mockResolvedValue(
      Result.ok(persistedOrder(orderData)),
    );
    const changed = {
      ...orderData,
      deliveryAddress: { ...orderData.deliveryAddress, subCity: 'Arada' },
    };

    await expect(
      dependencies.service.createOrder(restaurantId, changed, 'retry-key'),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(dependencies.orderRepository.startSession).not.toHaveBeenCalled();
    expect(
      dependencies.restaurantRepository.getStatusById,
    ).not.toHaveBeenCalled();
    expectNoCheckoutSideEffects(dependencies);
  });
});
