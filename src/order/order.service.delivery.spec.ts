import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Cart } from 'src/cart/cart';
import { AvailabilityStatus } from 'src/delivery-person/constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { OrderStatus, PaymentStatus } from './constants/constants';
import { OrderService } from './order.service';
import { Order } from './order';

describe('OrderService delivery completion', () => {
  it('releases the courier while retaining historical assignment', async () => {
    const orderId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const restaurantId = new Types.ObjectId();
    const deliveryPersonId = new Types.ObjectId();
    const audit = Audit.create({
      auditCreatedBy: 'customer@example.com',
      auditCreatedDateTime: '2026-10-14T09:00:00.000Z',
    }).getValue();
    const cart = Cart.create({
      userId,
      totalPrice: 25,
      cartItems: [],
      audit,
    }).getValue();
    const createOrder = (status: OrderStatus, paymentStatus: PaymentStatus) =>
      Order.create(
        {
          userId,
          restaurantId,
          cart,
          deliveryAddress: { city: 'Nairobi', subCity: 'Westlands' },
          status,
          totalPrice: 25,
          paymentStatus,
          deliveryPersonId,
          deliveryPerson: null,
          audit,
        },
        orderId,
      ).getValue();
    const assignedOrder = createOrder(
      OrderStatus.OUT_FOR_DELIVERY,
      PaymentStatus.PENDING,
    );
    const deliveredOrder = createOrder(
      OrderStatus.DELIVERED,
      PaymentStatus.PAID,
    );
    const context = new Context('operator@example.com', 'correlation-id');
    context.setPrincipal({
      userId: new Types.ObjectId().toString(),
      email: 'operator@example.com',
      role: Role.DELIVERY_COMPANY_ADMINISTRATOR,
    });
    const session = {
      withTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const orderRepository = {
      getOrderById: jest.fn().mockResolvedValue(Result.ok(assignedOrder)),
      startSession: jest.fn().mockResolvedValue(session),
      transitionOrder: jest.fn().mockResolvedValue(Result.ok(deliveredOrder)),
    };
    const deliveryPersonRepository = {
      changeAvailability: jest.fn().mockResolvedValue(Result.ok({})),
    };
    const orderEvents = { publish: jest.fn() };
    const notificationOutbox = { enqueueOrderStatusChange: jest.fn() };
    const service = new OrderService(
      { getContext: () => context } as never,
      {
        getContextUser: () =>
          Promise.resolve({
            id: new Types.ObjectId(),
            role: Role.DELIVERY_COMPANY_ADMINISTRATOR,
          }),
      } as never,
      {
        getRestaurantByI: () =>
          Promise.resolve({
            deliveryPersonAvailability: false,
            restaurantAdminId: new Types.ObjectId(),
          }),
      } as never,
      {} as never,
      orderRepository as never,
      deliveryPersonRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      orderEvents as never,
      notificationOutbox as never,
    );

    const result = await service.markDelivered(orderId);

    expect(deliveryPersonRepository.changeAvailability).toHaveBeenCalledWith(
      deliveryPersonId,
      AvailabilityStatus.WORKING,
      AvailabilityStatus.AVAILABLE,
      expect.any(Object),
      { session },
    );
    const update = orderRepository.transitionOrder.mock.calls[0][2];
    expect(update).toMatchObject({
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    });
    expect(update).not.toHaveProperty('deliveryPersonId');
    expect(result.getValue().deliveryPersonId).toEqual(deliveryPersonId);
    expect(orderEvents.publish).toHaveBeenCalledWith(
      deliveredOrder,
      'correlation-id',
    );
    expect(notificationOutbox.enqueueOrderStatusChange).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
