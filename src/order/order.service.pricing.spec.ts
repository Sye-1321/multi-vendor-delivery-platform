import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { MenuItem } from 'src/menu-item/menu-item';
import { CreateOrderDTO } from './dtos/order.dto';
import { OrderService } from './order.service';
import { RestaurantStatus } from 'src/restaurant/constants/constants';

describe('OrderService checkout pricing', () => {
  const restaurantId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  function menuItem(price: number): MenuItem {
    return MenuItem.create({
      name: 'Item',
      image: 'item.png',
      price,
      availability: true,
      restaurantId,
      audit: Audit.create({
        auditCreatedBy: 'seed@example.com',
        auditCreatedDateTime: new Date().toISOString(),
      }).getValue(),
    }).getValue();
  }

  function buildService(items: MenuItem[]) {
    const context = new Context('customer@example.com', 'correlation-id');
    context.setPrincipal({
      userId: userId.toString(),
      email: 'customer@example.com',
      role: Role.END_USER,
    });
    const session = {
      withTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
      endSession: jest.fn(),
    };
    const orderRepository = {
      startSession: jest.fn().mockResolvedValue(session),
      createOrder: jest.fn(),
    };
    const cartItemRepository = { insertManyWithSession: jest.fn() };
    const cartRepository = { create: jest.fn() };
    let createdOrder: unknown;
    const orderMapper = {
      toPersistence: jest.fn((order) => {
        createdOrder = order;
        return order;
      }),
    };
    orderRepository.createOrder.mockImplementation(() =>
      Promise.resolve(Result.ok(createdOrder)),
    );
    cartItemRepository.insertManyWithSession.mockResolvedValue(Result.ok([]));
    cartRepository.create.mockResolvedValue(Result.ok({}));

    const menuItemRepository = {
      getAvailableMenuItemsByIds: jest.fn().mockResolvedValue(Result.ok(items)),
    };
    const restaurantRepository = {
      getStatusById: jest.fn().mockResolvedValue(RestaurantStatus.ACTIVE),
    };
    const service = new OrderService(
      { getContext: () => context } as never,
      { getContextUser: () => Promise.resolve({ id: userId }) } as never,
      {} as never,
      restaurantRepository as never,
      orderRepository as never,
      {} as never,
      menuItemRepository as never,
      { toPersistence: (item) => item } as never,
      cartItemRepository as never,
      { toPersistence: (cart) => cart } as never,
      cartRepository as never,
      orderMapper as never,
      { publish: jest.fn() } as never,
      { enqueueOrderStatusChange: jest.fn() } as never,
    );

    return {
      service,
      session,
      orderRepository,
      menuItemRepository,
      cartItemRepository,
      cartRepository,
    };
  }

  function orderData(items: Array<{ item: MenuItem; quantity: number }>) {
    return {
      cart: {
        cartItems: items.map(({ item, quantity }) => ({
          menuItemId: item.id.toString(),
          quantity,
        })),
      },
      deliveryAddress: { city: 'Addis Ababa', subCity: 'Bole' },
    } as CreateOrderDTO;
  }

  async function expectUnsafeCheckout(items: MenuItem[], quantities: number[]) {
    const dependencies = buildService(items);
    const promise = dependencies.service.createOrder(
      restaurantId,
      orderData(
        items.map((item, index) => ({ item, quantity: quantities[index] })),
      ),
    );

    await expect(promise).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
    expect(
      dependencies.cartItemRepository.insertManyWithSession,
    ).not.toHaveBeenCalled();
    expect(dependencies.cartRepository.create).not.toHaveBeenCalled();
    expect(dependencies.orderRepository.createOrder).not.toHaveBeenCalled();
  }

  it('persists exact ordinary line subtotals and order total', async () => {
    const first = menuItem(19.99);
    const second = menuItem(5.5);
    const dependencies = buildService([first, second]);

    const result = await dependencies.service.createOrder(
      restaurantId,
      orderData([
        { item: first, quantity: 2 },
        { item: second, quantity: 1 },
      ]),
    );

    expect(result.getValue().totalPrice).toBe(45.48);
    const persistedItems =
      dependencies.cartItemRepository.insertManyWithSession.mock.calls[0][0];
    expect(
      persistedItems.map((item: { subTotal: number }) => item.subTotal),
    ).toEqual([39.98, 5.5]);
    expect(dependencies.cartRepository.create.mock.calls[0][0].totalPrice).toBe(
      45.48,
    );
    expect(
      dependencies.orderRepository.createOrder.mock.calls[0][0].totalPrice,
    ).toBe(45.48);
  });

  it('rejects a finite price whose minor-unit conversion is unsafe', async () => {
    await expectUnsafeCheckout([menuItem(100_000_000_000_000)], [1]);
  });

  it('rejects an unsafe line subtotal before persistence', async () => {
    const price = 1_000_000_000_000;
    expect(Number.isSafeInteger(Math.round(price * 100))).toBe(true);
    expect(Number.isSafeInteger(Math.round(price * 100) * 100)).toBe(false);
    await expectUnsafeCheckout([menuItem(price)], [100]);
  });

  it('rejects an unsafe accumulated total when each line is safe', async () => {
    const price = 45_100_000_000_000;
    const lineSubtotal = Math.round(price * 100);
    expect(Number.isSafeInteger(lineSubtotal)).toBe(true);
    expect(Number.isSafeInteger(lineSubtotal + lineSubtotal)).toBe(false);
    await expectUnsafeCheckout([menuItem(price), menuItem(price)], [1, 1]);
  });

  it('propagates unexpected checkout errors while cleaning up without writes', async () => {
    const item = menuItem(10);
    const dependencies = buildService([item]);
    const unexpected = new Error('menu lookup failed');
    dependencies.menuItemRepository.getAvailableMenuItemsByIds.mockRejectedValue(
      unexpected,
    );

    await expect(
      dependencies.service.createOrder(
        restaurantId,
        orderData([{ item, quantity: 1 }]),
      ),
    ).rejects.toBe(unexpected);
    expect(dependencies.session.endSession).toHaveBeenCalledTimes(1);
    expect(
      dependencies.cartItemRepository.insertManyWithSession,
    ).not.toHaveBeenCalled();
    expect(dependencies.cartRepository.create).not.toHaveBeenCalled();
    expect(dependencies.orderRepository.createOrder).not.toHaveBeenCalled();
  });
});
