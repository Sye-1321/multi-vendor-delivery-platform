import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';
import { CartMapper } from 'src/cart/cart.mapper';
import {
  AvailabilityStatus,
  DeliveryPersonOwnership,
  DeliveryPersonStatus,
} from 'src/delivery-person/constants/constants';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';
import { OrderStatus, PaymentStatus } from 'src/order/constants/constants';
import { OrderMapper } from 'src/order/order.mapper';
import { OrderRepository } from './order.repository';
import { CartItemDataModel, CartItemSchema } from './schemas/cart-item.schema';
import { CartDataModel, CartSchema } from './schemas/cart.schema';
import {
  DeliveryPersonDataModel,
  DeliveryPersonSchema,
} from './schemas/delivery-person.schema';
import { OrderDataModel, OrderSchema } from './schemas/order.schema';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Order history (MongoDB)', () => {
  let connection: Connection;
  let cartItems: Model<CartItemDataModel>;
  let carts: Model<CartDataModel>;
  let deliveryPersons: Model<DeliveryPersonDataModel>;
  let orders: Model<OrderDataModel>;
  let repository: OrderRepository;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `order_history_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    cartItems = connection.model(CartItemDataModel.name, CartItemSchema);
    carts = connection.model(CartDataModel.name, CartSchema);
    deliveryPersons = connection.model(
      DeliveryPersonDataModel.name,
      DeliveryPersonSchema,
    );
    orders = connection.model(OrderDataModel.name, OrderSchema);
    await Promise.all([
      cartItems.syncIndexes(),
      carts.syncIndexes(),
      deliveryPersons.syncIndexes(),
      orders.syncIndexes(),
    ]);
    const auditMapper = new AuditMapper();
    repository = new OrderRepository(
      orders as never,
      connection,
      new OrderMapper(
        auditMapper,
        new CartMapper(auditMapper, new CartItemMapper(auditMapper)),
        new DeliveryPersonMapper(auditMapper),
      ),
    );
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('loads persisted lines without a current menu-item document', async () => {
    const audit = {
      auditCreatedBy: 'seed@example.com',
      auditCreatedDateTime: '2026-10-14T09:00:00.000Z',
    };
    const missingMenuItemId = new Types.ObjectId();
    const line = await cartItems.create({
      _id: new Types.ObjectId(),
      menuItemId: missingMenuItemId,
      quantity: 2,
      subTotal: 18.5,
      customizations: 'Extra spicy',
      ...audit,
    });
    const userId = new Types.ObjectId();
    const cart = await carts.create({
      _id: new Types.ObjectId(),
      userId,
      totalPrice: 18.5,
      cartItems: [line._id],
      ...audit,
    });
    const courier = await deliveryPersons.create({
      _id: new Types.ObjectId(),
      profileImage: 'delivery-persons/courier.png',
      name: 'Historical Courier',
      phoneNumber: '251900000001',
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      status: DeliveryPersonStatus.ACTIVE,
      deliveryType: DeliveryPersonOwnership.SYSTEM,
      restaurantId: null,
      savedAddress: { city: 'Nairobi', subCity: 'Westlands' },
      ...audit,
    });
    const persistedOrder = await orders.create({
      _id: new Types.ObjectId(),
      userId,
      restaurantId: new Types.ObjectId(),
      cart: cart._id,
      deliveryAddress: { city: 'Nairobi', subCity: 'Westlands' },
      status: OrderStatus.DELIVERED,
      totalPrice: 18.5,
      paymentStatus: PaymentStatus.PAID,
      deliveryPersonId: courier._id,
      timeline: [],
      ...audit,
    });

    const result = await repository.getOrderById(persistedOrder._id);

    expect(result.isSuccess).toBe(true);
    const order = result.getValue();
    expect(order.cart.id).toEqual(cart._id);
    expect(order.cart.cartItems).toHaveLength(1);
    expect(order.cart.cartItems?.[0]).toMatchObject({
      id: line._id,
      menuItemId: missingMenuItemId,
      quantity: 2,
      subTotal: 18.5,
      customizations: 'Extra spicy',
    });
    expect(order.deliveryPersonId).toEqual(courier._id);
    expect(order.deliveryPerson?.id).toEqual(courier._id);
  });
});
