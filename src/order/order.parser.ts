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
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      deliveryPerson: order.deliveryPerson ? DeliveryPersonParser.createDeliveryPersonResponse(order.deliveryPerson)
     : null,
      ...AuditParser.createAuditResponse(order.audit),
    };

    return orderResponse;
  }


  static createOrdersResponse(orders: Order[]): IOrderResponseDTO[] {
    return orders.map((order) => OrderParser.createOrderResponse(order));
  }
}
