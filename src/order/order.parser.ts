import { DeliveryPersonParser } from 'src/delivery-person/delivery-person.parser';
import { IOrderResponseDTO } from './dtos/order-response.dto';
import { Order } from './order';
import { AuditParser } from 'src/audit/audit.parser';

export class OrderParser {
  static createOrderResponse(order: Order): IOrderResponseDTO {
    const orderResponse: IOrderResponseDTO = {
      id: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      cart: {
        id: order.cart.id,
        totalPrice: order.cart.totalPrice,
        cartItems: (order.cart.cartItems ?? []).map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          subTotal: item.subTotal,
          ...(item.customizations !== undefined && {
            customizations: item.customizations,
          }),
        })),
      },
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      timeline: order.timeline.map(
        ({ from, to, actorRole, occurredAt, reason }) => ({
          from,
          to,
          actorRole,
          occurredAt,
          reason,
        }),
      ),
      deliveryPersonId: order.deliveryPersonId,
      deliveryPerson: order.deliveryPerson
        ? DeliveryPersonParser.createDeliveryPersonResponse(
            order.deliveryPerson,
          )
        : null,
      ...AuditParser.createAuditResponse(order.audit),
    };

    return orderResponse;
  }

  static createOrdersResponse(orders: Order[]): IOrderResponseDTO[] {
    return orders.map((order) => OrderParser.createOrderResponse(order));
  }
}
