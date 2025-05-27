import { IOrderDataModel } from 'src/infrastructure/data_access/repositories/models/order-model.interface';
import { Order } from './order';
import { OrderDataModel } from 'src/infrastructure/data_access/repositories/schemas/order.schema';
import { CartMapper } from 'src/cart/cart.mapper';
import { Injectable } from '@nestjs/common';
import { AuditMapper } from 'src/audit/audit.mapper';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';

@Injectable()
export class OrderMapper {
  constructor(
    private readonly auditMapper: AuditMapper,
    private readonly cartMapper: CartMapper,
    private readonly deliveryPersonMapper: DeliveryPersonMapper,
  ) {}

  toDomain(doc: OrderDataModel): Order {
    const {
      _id,
      userId,
      restaurantId,
      cart,
      deliveryAddress,
      status,
      totalPrice,
      paymentStatus,
      deliveryPerson,
      deliveryPersonId,
    } = doc;

    const deliveryPersonDomain = deliveryPerson
      ? this.deliveryPersonMapper.toDomain(deliveryPerson)
      : null;

    const entity = Order.create(
      {
        userId,
        restaurantId,
        cart: this.cartMapper.toDomain(cart),
        deliveryAddress,
        totalPrice,
        paymentStatus,
        status,
        deliveryPersonId,
        deliveryPerson: deliveryPersonDomain,
        audit: this.auditMapper.toDomain(doc),
      },
      _id,
    ).getValue();

    return entity;
  }

  toPersistence(order: Order): OrderDataModel {
    const {
      id,
      userId,
      restaurantId,
      cart,
      deliveryAddress,
      totalPrice,
      paymentStatus,
      audit,
      status,
      deliveryPerson,
      deliveryPersonId,
    } = order;

    const {
      auditCreatedBy,
      auditCreatedDateTime,
      auditDeletedBy,
      auditDeletedDateTime,
      auditModifiedBy,
      auditModifiedDateTime,
    } = audit;

    const document: OrderDataModel = {
      _id: id,
      userId,
      status,
      restaurantId,
      cart: this.cartMapper.toPersistence(cart),
      paymentStatus,
      deliveryAddress,
      deliveryPersonId: deliveryPerson ? deliveryPerson.id : deliveryPersonId ?? null,
      totalPrice,
      auditCreatedBy,
      auditCreatedDateTime,
      auditDeletedBy,
      auditDeletedDateTime,
      auditModifiedBy,
      auditModifiedDateTime,
    };

    return document;
  }
}
