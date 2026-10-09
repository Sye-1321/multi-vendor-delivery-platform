import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderMapper } from './order.mapper';
import { TYPES } from './../application/constants/types';
import { Audit } from './../domain/audit/audit';
import { Result } from './../domain/result/result';
import { throwApplicationError } from './../infrastructure/utilities/exception-instance';
import { CartItemRepository } from 'src/infrastructure/data_access/repositories/cart-item.repository';
import { Cart } from 'src/cart/cart';
import { CartMapper } from 'src/cart/cart.mapper';
import { CartRepository } from 'src/infrastructure/data_access/repositories/cart.repository';
import { Order } from './order';
import { OrderParser } from './order.parser';
import { IOrderResponseDTO } from './dtos/order-response.dto';
import { IUserService } from 'src/user/interfaces/user-service.interface';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';
import { CartItem } from 'src/cart-item/cartItem';
import { OrderStatus, PaymentStatus } from './constants/constants';
import { Role } from 'src/application/constants/constants';
import { Context } from 'src/infrastructure/context/context';
import { CreateOrderDTO } from './dtos/order.dto';
import { IOrderRepository } from 'src/infrastructure/data_access/repositories/interfaces/order-repository';
import { IOrderService } from './interfaces/order.service.interface';
import { IMenuItemRepository } from 'src/infrastructure/data_access/repositories/interfaces/menu-item-repository';
import { MenuItem } from 'src/menu-item/menu-item';
import {
  IDeliveryPersonRepository,
  DeliveryPersonScope,
} from 'src/infrastructure/data_access/repositories/interfaces/deliveryperson-repository.interface';
import {
  AvailabilityStatus,
  DeliveryPersonOwnership,
} from 'src/delivery-person/constants/constants';
import { IOrderTransition } from './interfaces/order.interface';
import { OrderEventPublisher } from './realtime/order-event.publisher';
import { NotificationOutboxService } from 'src/notifications/notification-outbox.service';
import { CancelOrderDTO } from './dtos/cancel-order.dto';

@Injectable()
export class OrderService implements IOrderService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: RestaurantService,
    @Inject(TYPES.IOrderRepository)
    private readonly orderRepository: IOrderRepository,
    @Inject(TYPES.IDeliveryPersonRepository)
    private readonly deliveryPersonRepository: IDeliveryPersonRepository,
    @Inject(TYPES.IMenuItemRepository)
    private readonly menuItemRepository: IMenuItemRepository,
    private readonly cartItemMapper: CartItemMapper,
    private readonly cartItemRepository: CartItemRepository,
    private readonly cartMapper: CartMapper,
    private readonly cartRepository: CartRepository,
    private readonly orderMapper: OrderMapper,
    private readonly orderEvents: OrderEventPublisher,
    private readonly notificationOutbox: NotificationOutboxService,
  ) {}

  async createOrder(
    restaurantId: Types.ObjectId,
    orderData: CreateOrderDTO,
  ): Promise<Result<IOrderResponseDTO>> {
    const context = this.contextService.getContext();
    const contextUser = await this.userService.getContextUser();
    const restaurantIdValue = restaurantId.toString();

    if (!Types.ObjectId.isValid(restaurantIdValue)) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Invalid restaurant ID.');
    }

    const restaurantObjectId = new Types.ObjectId(restaurantIdValue);
    const session = await this.orderRepository.startSession();
    try {
      const savedOrder = await session.withTransaction(async () => {
        const audit = Audit.createInsertContext(context);
        const cartItems = orderData.cart.cartItems;
        const uniqueMenuItemIds = [
          ...new Set(cartItems.map((item) => item.menuItemId)),
        ].map((id) => new Types.ObjectId(id));

        const menuItemsResult =
          await this.menuItemRepository.getAvailableMenuItemsByIds(
            restaurantObjectId,
            uniqueMenuItemIds,
            { session },
          );
        const menuItems = menuItemsResult.getValue();

        if (
          !menuItemsResult.isSuccess ||
          menuItems.length !== uniqueMenuItemIds.length
        ) {
          throwApplicationError(
            HttpStatus.BAD_REQUEST,
            'One or more menu items are unavailable for this restaurant.',
          );
        }

        const menuItemsById = new Map(
          menuItems.map((item) => [item.id.toString(), item]),
        );
        let totalPriceInMinorUnits = 0;

        const selectedItems = cartItems.map((item) => {
          const menuItem = this.getMenuItemOrThrow(
            menuItemsById,
            item.menuItemId,
          );

          const unitPriceInMinorUnits = this.toMinorUnits(menuItem.price);
          const subTotalInMinorUnits = unitPriceInMinorUnits * item.quantity;

          if (!Number.isSafeInteger(subTotalInMinorUnits)) {
            throwApplicationError(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'Order total is outside the supported numeric range.',
            );
          }

          const nextTotalInMinorUnits =
            totalPriceInMinorUnits + subTotalInMinorUnits;

          if (!Number.isSafeInteger(nextTotalInMinorUnits)) {
            throwApplicationError(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'Order total is outside the supported numeric range.',
            );
          }

          totalPriceInMinorUnits = nextTotalInMinorUnits;

          return CartItem.create({
            menuItemId: menuItem.id,
            quantity: item.quantity,
            subTotal: this.fromMinorUnits(subTotalInMinorUnits),
            customizations: item.customizations,
            audit,
          }).getValue();
        });

        const selectedCartItemsDataModel = selectedItems.map((item) =>
          this.cartItemMapper.toPersistence(item),
        );
        const insertedItems =
          await this.cartItemRepository.insertManyWithSession(
            selectedCartItemsDataModel,
            { session },
          );

        if (!insertedItems.isSuccess) {
          throwApplicationError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Could not persist the order items.',
          );
        }

        const totalPrice = this.fromMinorUnits(totalPriceInMinorUnits);
        const cart = Cart.create({
          userId: contextUser.id,
          totalPrice,
          cartItems: selectedItems,
          audit: Audit.createInsertContext(context),
        }).getValue();
        const insertedCart = await this.cartRepository.create(
          this.cartMapper.toPersistence(cart),
          { session },
        );

        if (!insertedCart.isSuccess) {
          throwApplicationError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Could not persist the order cart.',
          );
        }

        const initialTransition = this.createOrderTransition(
          context,
          null,
          OrderStatus.PENDING,
        );
        const order = Order.create({
          userId: contextUser.id,
          restaurantId: restaurantObjectId,
          deliveryAddress: orderData.deliveryAddress,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalPrice,
          cart,
          timeline: [initialTransition],
          audit,
        }).getValue();
        const savedOrderResult = await this.orderRepository.createOrder(
          this.orderMapper.toPersistence(order),
          { session },
        );

        if (!savedOrderResult.isSuccess) {
          throwApplicationError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Could not persist the order.',
          );
        }

        const createdOrder = savedOrderResult.getValue();
        await this.notificationOutbox.enqueueOrderStatusChange(
          createdOrder,
          initialTransition,
          session,
        );
        return createdOrder;
      });

      if (!savedOrder) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'The order transaction completed without a saved order.',
        );
      }

      this.orderEvents.publish(savedOrder, context.correlationId);
      return Result.ok(OrderParser.createOrderResponse(savedOrder));
    } finally {
      await session.endSession();
    }
  }

  private toMinorUnits(amount: number): number {
    const minorUnits = Math.round((amount + Number.EPSILON) * 100);

    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      !Number.isSafeInteger(minorUnits)
    ) {
      throwApplicationError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Order total is outside the supported numeric range.',
      );
    }

    return minorUnits;
  }

  private fromMinorUnits(amount: number): number {
    return amount / 100;
  }

  private getMenuItemOrThrow(
    menuItemsById: Map<string, MenuItem>,
    menuItemId: string,
  ): MenuItem {
    const menuItem = menuItemsById.get(menuItemId);

    if (!menuItem) {
      return throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'A selected menu item is unavailable.',
      );
    }

    return menuItem;
  }

  async cancelOrder(
    orderId: Types.ObjectId,
    request: CancelOrderDTO,
  ): Promise<Result<IOrderResponseDTO>> {
    const context = this.contextService.getContext();
    const contextUser = await this.userService.getContextUser();
    const order = await this.orderRepository.getOrderById(orderId, {
      userId: contextUser.id,
    });
    if (!order.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'The order with the provided ID was not found',
      );
    }
    if (order.getValue().status !== OrderStatus.PENDING) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Order status must be "PENDING" to cancel',
      );
    }

    const updatedOrder = await this.transitionOrderStatus(
      orderId,
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
      context,
      request.reason.trim(),
    );

    return Result.ok(OrderParser.createOrderResponse(updatedOrder));
  }

  async acceptOrder(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const order = await this.orderRepository.getOrderById(orderId, {
      restaurantId: restaurant.id,
    });
    if (!order.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'The order with the provided ID was not found',
      );
    }
    if (order.getValue().status !== OrderStatus.PENDING) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Order status must be "PENDING" to accept',
      );
    }
    const context = this.contextService.getContext();
    const updatedOrder = await this.transitionOrderStatus(
      orderId,
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      context,
    );

    return Result.ok(OrderParser.createOrderResponse(updatedOrder));
  }

  async orderPrepared(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const order = await this.orderRepository.getOrderById(orderId, {
      restaurantId: restaurant.id,
    });
    if (!order.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'The order with the provided ID was not found',
      );
    }
    if (order.getValue().status !== OrderStatus.ACCEPTED) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Order status must be "ACCEPTED" to set prepared',
      );
    }
    const context = this.contextService.getContext();
    const updatedOrder = await this.transitionOrderStatus(
      orderId,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARED,
      context,
    );
    return Result.ok(OrderParser.createOrderResponse(updatedOrder));
  }

  async markDelivered(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const context = this.contextService.getContext();
    const contextUser = await this.userService.getContextUser();
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'The order with the provided ID was not found',
      );
    }
    if (order.getValue().status !== OrderStatus.OUT_FOR_DELIVERY) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'not possible');
    }

    const deliveryPersonId = order.getValue().deliveryPersonId;

    if (!deliveryPersonId) {
      return throwApplicationError(
        HttpStatus.CONFLICT,
        'The order has no assigned delivery person.',
      );
    }
    const assignedDeliveryPersonId = deliveryPersonId;

    const restaurant = await this.restaurantService.getRestaurantByI(
      order.getValue().restaurantId,
    );
    if (restaurant.deliveryPersonAvailability) {
      if (
        contextUser.role !== Role.RESTAURANT_ADMINISTRATOR ||
        contextUser.id.toString() !== restaurant.restaurantAdminId.toString()
      ) {
        throwApplicationError(
          HttpStatus.FORBIDDEN,
          'Only the restaurant admin can release delivery person.',
        );
      }
    } else {
      if (contextUser.role !== Role.DELIVERY_COMPANY_ADMINISTRATOR) {
        throwApplicationError(
          HttpStatus.FORBIDDEN,
          'Only a delivery company administrator can release a delivery person.',
        );
      }
    }

    const auditUpdate = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
    };
    const orderTransition = this.createOrderTransition(
      context,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    );
    const session = await this.orderRepository.startSession();

    try {
      const updatedOrder = await session.withTransaction(async () => {
        const released = await this.deliveryPersonRepository.changeAvailability(
          assignedDeliveryPersonId,
          AvailabilityStatus.WORKING,
          AvailabilityStatus.AVAILABLE,
          auditUpdate,
          { session },
        );

        if (!released.isSuccess) {
          throwApplicationError(
            HttpStatus.CONFLICT,
            'The delivery person could not be released.',
          );
        }

        const transition = await this.orderRepository.transitionOrder(
          orderId,
          OrderStatus.OUT_FOR_DELIVERY,
          {
            ...auditUpdate,
            deliveryPersonId: null,
            status: OrderStatus.DELIVERED,
            paymentStatus: PaymentStatus.PAID,
          },
          orderTransition,
          { session },
        );

        if (!transition.isSuccess) {
          throwApplicationError(
            HttpStatus.CONFLICT,
            'The order is no longer out for delivery.',
          );
        }

        const deliveredOrder = transition.getValue();
        await this.notificationOutbox.enqueueOrderStatusChange(
          deliveredOrder,
          orderTransition,
          session,
        );
        return deliveredOrder;
      });

      if (!updatedOrder) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'The delivery transaction did not return an order.',
        );
      }

      this.orderEvents.publish(updatedOrder, context.correlationId);
      return Result.ok(OrderParser.createOrderResponse(updatedOrder));
    } finally {
      await session.endSession();
    }
  }

  async assignDeliveryPerson(
    orderId: Types.ObjectId,
    deliveryPersonId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const context = this.contextService.getContext();
    const contextUser = await this.userService.getContextUser();
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'order not found');
    }

    if (order.getValue().status !== OrderStatus.PREPARED) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'not possible');
    }

    const restaurant = await this.restaurantService.getRestaurantByI(
      order.getValue().restaurantId,
    );
    let deliveryPersonScope: DeliveryPersonScope;

    if (restaurant.deliveryPersonAvailability) {
      if (
        contextUser.role !== Role.RESTAURANT_ADMINISTRATOR ||
        contextUser.id.toString() !== restaurant.restaurantAdminId.toString()
      ) {
        throwApplicationError(
          HttpStatus.FORBIDDEN,
          'Only the restaurant administrator can assign delivery person.',
        );
      }
      deliveryPersonScope = {
        deliveryType: DeliveryPersonOwnership.RESTAURANT,
        restaurantId: restaurant.id,
      };
    } else {
      if (contextUser.role !== Role.DELIVERY_COMPANY_ADMINISTRATOR) {
        throwApplicationError(
          HttpStatus.FORBIDDEN,
          'Only the delivery company administrator can assign.',
        );
      }
      deliveryPersonScope = {
        deliveryType: DeliveryPersonOwnership.SYSTEM,
      };
    }

    const auditUpdate = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
    };
    const orderTransition = this.createOrderTransition(
      context,
      OrderStatus.PREPARED,
      OrderStatus.OUT_FOR_DELIVERY,
    );
    const session = await this.orderRepository.startSession();

    try {
      const updatedOrder = await session.withTransaction(async () => {
        const claimed = await this.deliveryPersonRepository.changeAvailability(
          deliveryPersonId,
          AvailabilityStatus.AVAILABLE,
          AvailabilityStatus.WORKING,
          auditUpdate,
          {
            scope: deliveryPersonScope,
            session,
          },
        );

        if (!claimed.isSuccess) {
          throwApplicationError(
            HttpStatus.CONFLICT,
            'The delivery person is no longer available.',
          );
        }

        const transition = await this.orderRepository.transitionOrder(
          orderId,
          OrderStatus.PREPARED,
          {
            ...auditUpdate,
            deliveryPersonId: claimed.getValue().id,
            status: OrderStatus.OUT_FOR_DELIVERY,
          },
          orderTransition,
          { session },
        );

        if (!transition.isSuccess) {
          throwApplicationError(
            HttpStatus.CONFLICT,
            'The order is no longer ready for assignment.',
          );
        }

        const assignedOrder = transition.getValue();
        await this.notificationOutbox.enqueueOrderStatusChange(
          assignedOrder,
          orderTransition,
          session,
        );
        return assignedOrder;
      });

      if (!updatedOrder) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'The assignment transaction did not return an order.',
        );
      }

      this.orderEvents.publish(updatedOrder, context.correlationId);
      return Result.ok(OrderParser.createOrderResponse(updatedOrder));
    } finally {
      await session.endSession();
    }
  }

  private async transitionOrderStatus(
    orderId: Types.ObjectId,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
    context: Context,
    reason?: string,
  ): Promise<Order> {
    const transition = this.createOrderTransition(
      context,
      expectedStatus,
      nextStatus,
      reason,
    );
    const session = await this.orderRepository.startSession();

    try {
      const order = await session.withTransaction(async () => {
        const result = await this.orderRepository.transitionOrder(
          orderId,
          expectedStatus,
          {
            status: nextStatus,
            auditModifiedBy: context.email,
            auditModifiedDateTime: new Date().toISOString(),
          },
          transition,
          { session },
        );

        if (!result.isSuccess) {
          throwApplicationError(
            HttpStatus.CONFLICT,
            `Order status changed before it could move from ${expectedStatus} to ${nextStatus}.`,
          );
        }

        const transitionedOrder = result.getValue();
        await this.notificationOutbox.enqueueOrderStatusChange(
          transitionedOrder,
          transition,
          session,
        );
        return transitionedOrder;
      });

      if (!order) {
        return throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'The order transition did not return an order.',
        );
      }

      this.orderEvents.publish(order, context.correlationId);
      return order;
    } finally {
      await session.endSession();
    }
  }

  private createOrderTransition(
    context: Context,
    from: OrderStatus | null,
    to: OrderStatus,
    reason?: string,
  ): IOrderTransition {
    if (!context.userId || !context.role) {
      return throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Authenticated order transition context is unavailable.',
      );
    }

    return {
      from,
      to,
      actorId: new Types.ObjectId(context.userId),
      actorRole: context.role,
      occurredAt: new Date().toISOString(),
      correlationId: context.correlationId,
      reason,
    };
  }

  async getOrdersByUser(): Promise<Result<IOrderResponseDTO[]>> {
    const user = await this.userService.getContextUser();
    const ordersResult = await this.orderRepository.getOrders({
      userId: user.id,
    });
    if (!ordersResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'you have no order history');
    }
    const orders = ordersResult.getValue();
    const response: IOrderResponseDTO[] =
      orders && orders.length ? OrderParser.createOrdersResponse(orders) : [];

    return Result.ok(response);
  }

  async getRestaurantOrders(): Promise<Result<IOrderResponseDTO[]>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const adminRestaurantId = restaurant.id;
    const ordersResult = await this.orderRepository.getOrders({
      restaurantId: adminRestaurantId,
    });
    if (!ordersResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'something went wrong');
    }
    const orders = ordersResult.getValue();
    const response: IOrderResponseDTO[] =
      orders && orders.length ? OrderParser.createOrdersResponse(orders) : [];

    return Result.ok(response);
  }

  async getRestaurantOrderById(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const adminRestaurantId = restaurant.id;
    const orderResult = await this.orderRepository.getOrderById(orderId, {
      restaurantId: adminRestaurantId,
    });

    if (!orderResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Order not found');
    }

    const response = OrderParser.createOrderResponse(orderResult.getValue());
    return Result.ok(response);
  }

  async getAllOrders(): Promise<Result<IOrderResponseDTO[]>> {
    const contextUser = await this.userService.getContextUser();
    if (contextUser.role !== Role.DELIVERY_COMPANY_ADMINISTRATOR) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        "You don't have sufficient privileges to watch this",
      );
    }
    const ordersResult = await this.orderRepository.getOrders();
    if (!ordersResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'something went wrong');
    }
    const orders = ordersResult.getValue();
    const response: IOrderResponseDTO[] =
      orders && orders.length ? OrderParser.createOrdersResponse(orders) : [];

    return Result.ok(response);
  }

  async getOrderById(id: Types.ObjectId): Promise<Result<IOrderResponseDTO>> {
    const orderResult = await this.orderRepository.getOrderById(id);
    if (!orderResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Order not found');
    }
    const order = orderResult.getValue();
    const response = OrderParser.createOrderResponse(order);
    return Result.ok(response);
  }

  async getOrderByIdForCurrentUser(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const user = await this.userService.getContextUser();
    const orderResult = await this.orderRepository.getOrderById(orderId, {
      userId: user.id,
    });

    if (!orderResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Order not found');
    }

    const response = OrderParser.createOrderResponse(orderResult.getValue());
    return Result.ok(response);
  }
}
