import { Order } from './order';
import { OrderDataModel } from 'src/infrastructure/data_access/repositories/schemas/order.schema';
import { CartMapper } from 'src/cart/cart.mapper';
import { Injectable } from '@nestjs/common';
import { AuditMapper } from 'src/audit/audit.mapper';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';
import { Types } from 'mongoose';
import { DeliveryPersonDataModel } from 'src/infrastructure/data_access/repositories/schemas/delivery-person.schema';

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
      deliveryPersonId,
      timeline,
    } = doc;

    const populatedDeliveryPerson =
      deliveryPersonId && !(deliveryPersonId instanceof Types.ObjectId)
        ? (deliveryPersonId as unknown as DeliveryPersonDataModel)
        : null;
    const deliveryPersonDomain = populatedDeliveryPerson
      ? this.deliveryPersonMapper.toDomain(populatedDeliveryPerson)
      : null;
    const resolvedDeliveryPersonId =
      populatedDeliveryPerson?._id ?? deliveryPersonId;

    const entity = Order.create(
      {
        userId,
        restaurantId,
        cart: this.cartMapper.toDomain(cart),
        deliveryAddress,
        totalPrice,
        paymentStatus,
        status,
        deliveryPersonId: resolvedDeliveryPersonId,
        deliveryPerson: deliveryPersonDomain,
        timeline,
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
      timeline,
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
      deliveryPersonId: deliveryPerson
        ? deliveryPerson.id
        : (deliveryPersonId ?? null),
      timeline: [...timeline],
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
