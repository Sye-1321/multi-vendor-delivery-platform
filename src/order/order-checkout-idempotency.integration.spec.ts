import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';
import { CartMapper } from 'src/cart/cart.mapper';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';
import { Role } from 'src/application/constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { CartItemRepository } from 'src/infrastructure/data_access/repositories/cart-item.repository';
import { CartRepository } from 'src/infrastructure/data_access/repositories/cart.repository';
import { OrderRepository } from 'src/infrastructure/data_access/repositories/order.repository';
import {
  CartItemDataModel,
  CartItemSchema,
} from 'src/infrastructure/data_access/repositories/schemas/cart-item.schema';
import {
  CartDataModel,
  CartSchema,
} from 'src/infrastructure/data_access/repositories/schemas/cart.schema';
import {
  DeliveryPersonDataModel,
  DeliveryPersonSchema,
} from 'src/infrastructure/data_access/repositories/schemas/delivery-person.schema';
import {
  OrderDataModel,
  OrderSchema,
} from 'src/infrastructure/data_access/repositories/schemas/order.schema';
import { MenuItem } from 'src/menu-item/menu-item';
import {
  NotificationDataModel,
  NotificationOutboxDataModel,
  NotificationOutboxSchema,
  NotificationSchema,
} from 'src/notifications/notification.schema';
import { NotificationOutboxService } from 'src/notifications/notification-outbox.service';
import { RestaurantStatus } from 'src/restaurant/constants/constants';
import { CreateOrderDTO } from './dtos/order.dto';
import { OrderMapper } from './order.mapper';
import { OrderService } from './order.service';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Checkout idempotency (MongoDB)', () => {
  let connection: Connection;
  let orders: Model<OrderDataModel>;
  let carts: Model<CartDataModel>;
  let cartItems: Model<CartItemDataModel>;
  let outbox: Model<NotificationOutboxDataModel>;
  let service: OrderService;
  let publish: jest.Mock;

  const userId = new Types.ObjectId();
  const restaurantId = new Types.ObjectId();
  const menuItemId = new Types.ObjectId();
  const request: CreateOrderDTO = {
    cart: {
      cartItems: [{ menuItemId: menuItemId.toString(), quantity: 2 }],
    },
    deliveryAddress: { city: 'Addis Ababa', subCity: 'Bole' },
  };

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `checkout_idempotency_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    orders = connection.model(OrderDataModel.name, OrderSchema);
    carts = connection.model(CartDataModel.name, CartSchema);
    cartItems = connection.model(CartItemDataModel.name, CartItemSchema);
    connection.model(DeliveryPersonDataModel.name, DeliveryPersonSchema);
    outbox = connection.model(
      NotificationOutboxDataModel.name,
      NotificationOutboxSchema,
    );
    const notifications = connection.model(
      NotificationDataModel.name,
      NotificationSchema,
    );
    await Promise.all([
      orders.syncIndexes(),
      carts.syncIndexes(),
      cartItems.syncIndexes(),
      outbox.syncIndexes(),
      notifications.syncIndexes(),
    ]);

    const auditMapper = new AuditMapper();
    const cartItemMapper = new CartItemMapper(auditMapper);
    const cartMapper = new CartMapper(auditMapper, cartItemMapper);
    const orderMapper = new OrderMapper(
      auditMapper,
      cartMapper,
      new DeliveryPersonMapper(auditMapper),
    );
    const orderRepository = new OrderRepository(
      orders as never,
      connection,
      orderMapper,
    );
    const cartRepository = new CartRepository(
      carts as never,
      connection,
      cartMapper,
    );
    const cartItemRepository = new CartItemRepository(
      cartItems as never,
      connection,
      cartItemMapper,
    );
    const context = new Context('customer@example.com', 'checkout-test');
    context.setPrincipal({
      userId: userId.toString(),
      email: 'customer@example.com',
      role: Role.END_USER,
    });
    const item = MenuItem.create(
      {
        name: 'Lunch',
        image: 'lunch.png',
        price: 12.5,
        availability: true,
        restaurantId,
        audit: Audit.createInsertContext(context),
      },
      menuItemId,
    ).getValue();
    publish = jest.fn();
    service = new OrderService(
      { getContext: () => context } as never,
      { getContextUser: () => Promise.resolve({ id: userId }) } as never,
      {} as never,
      {
        getStatusById: () => Promise.resolve(RestaurantStatus.ACTIVE),
      } as never,
      orderRepository,
      {} as never,
      {
        getAvailableMenuItemsByIds: () => Promise.resolve(Result.ok([item])),
      } as never,
      cartItemMapper,
      cartItemRepository,
      cartMapper,
      cartRepository,
      orderMapper,
      { publish } as never,
      new NotificationOutboxService(outbox as never, notifications as never),
    );
  });

  beforeEach(async () => {
    publish.mockClear();
    await Promise.all([
      orders.deleteMany({}),
      carts.deleteMany({}),
      cartItems.deleteMany({}),
      outbox.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await connection?.close();
  });

  it('commits one checkout and rolls back the concurrent duplicate', async () => {
    const [first, second] = await Promise.all([
      service.createOrder(restaurantId, request, 'same-checkout'),
      service.createOrder(restaurantId, request, 'same-checkout'),
    ]);

    expect(first.getValue().id).toEqual(second.getValue().id);
    await expect(orders.countDocuments()).resolves.toBe(1);
    await expect(carts.countDocuments()).resolves.toBe(1);
    await expect(cartItems.countDocuments()).resolves.toBe(1);
    await expect(outbox.countDocuments()).resolves.toBe(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('treats different keys as independent checkout intents', async () => {
    const [first, second] = await Promise.all([
      service.createOrder(restaurantId, request, 'checkout-a'),
      service.createOrder(restaurantId, request, 'checkout-b'),
    ]);

    expect(first.getValue().id).not.toEqual(second.getValue().id);
    await expect(orders.countDocuments()).resolves.toBe(2);
  });
});
