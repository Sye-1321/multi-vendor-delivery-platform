import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { CartItem } from 'src/cart-item/cartItem';
import { Cart } from 'src/cart/cart';
import { Audit } from 'src/domain/audit/audit';
import { OrderStatus, PaymentStatus } from './constants/constants';
import { OrderParser } from './order.parser';
import { Order } from './order';

describe('OrderParser', () => {
  it('serializes persisted checkout lines and stable courier identity', () => {
    const audit = Audit.create({
      auditCreatedBy: 'customer@example.com',
      auditCreatedDateTime: '2026-10-14T09:00:00.000Z',
    }).getValue();
    const firstLineId = new Types.ObjectId();
    const secondLineId = new Types.ObjectId();
    const firstMenuItemId = new Types.ObjectId();
    const secondMenuItemId = new Types.ObjectId();
    const deliveryPersonId = new Types.ObjectId();
    const cart = Cart.create(
      {
        userId: new Types.ObjectId(),
        totalPrice: 35.5,
        cartItems: [
          CartItem.create(
            {
              menuItemId: firstMenuItemId,
              quantity: 2,
              subTotal: 20,
              customizations: 'No onions',
              audit,
            },
            firstLineId,
          ).getValue(),
          CartItem.create(
            {
              menuItemId: secondMenuItemId,
              quantity: 1,
              subTotal: 15.5,
              audit,
            },
            secondLineId,
          ).getValue(),
        ],
        audit,
      },
      new Types.ObjectId(),
    ).getValue();
    const order = Order.create({
      userId: cart.userId,
      restaurantId: new Types.ObjectId(),
      cart,
      deliveryAddress: { city: 'Nairobi', subCity: 'Westlands' },
      status: OrderStatus.DELIVERED,
      totalPrice: 35.5,
      paymentStatus: PaymentStatus.PAID,
      deliveryPersonId,
      deliveryPerson: null,
      timeline: [
        {
          from: OrderStatus.OUT_FOR_DELIVERY,
          to: OrderStatus.DELIVERED,
          actorId: new Types.ObjectId(),
          actorRole: Role.DELIVERY_COMPANY_ADMINISTRATOR,
          occurredAt: '2026-10-14T10:00:00.000Z',
        },
      ],
      audit,
    }).getValue();

    const response = OrderParser.createOrderResponse(order);

    expect(response.cart).toEqual({
      id: cart.id,
      totalPrice: 35.5,
      cartItems: [
        {
          id: firstLineId,
          menuItemId: firstMenuItemId,
          quantity: 2,
          subTotal: 20,
          customizations: 'No onions',
        },
        {
          id: secondLineId,
          menuItemId: secondMenuItemId,
          quantity: 1,
          subTotal: 15.5,
        },
      ],
    });
    expect(response.deliveryPersonId).toEqual(deliveryPersonId);
    expect(response.deliveryPerson).toBeNull();
  });
});
