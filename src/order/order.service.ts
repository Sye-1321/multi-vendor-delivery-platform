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
import { DeliveryPersonService } from 'src/delivery-person/delivery-person.service';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';
import { CartItem } from 'src/cart-item/cartItem';
import { OrderStatus, PaymentStatus } from './constants/constants';
import { Role } from 'src/application/constants/constants';
import { Context } from 'src/infrastructure/context/context';
import { CreateOrderDTO } from './dtos/order.dto';
import { IOrderRepository } from 'src/infrastructure/data_access/repositories/interfaces/order-repository';
import { IOrderService } from './interfaces/order.service.interface';

@Injectable()
export class OrderService implements IOrderService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: RestaurantService,
    @Inject(TYPES.IDeliveryPersonService)
    private readonly deliveryPersonService: DeliveryPersonService,
    @Inject(TYPES.IOrderRepository)
    private readonly orderRepository: IOrderRepository,
    private readonly cartItemMapper: CartItemMapper,
    private readonly cartItemRepository: CartItemRepository,
    private readonly cartMapper: CartMapper,
    private readonly cartRepository: CartRepository,
    private readonly orderMapper: OrderMapper,
  ) {}

  async createOrder(
    restaurantId: Types.ObjectId,
    orderData: CreateOrderDTO,
  ): Promise<Result<IOrderResponseDTO>> {
    const context = this.contextService.getContext();
    const contextUser = await this.userService.getContextUser();
    const session = await this.orderRepository.startSession();

    try {
      session.startTransaction();
      const audit = Audit.createInsertContext(context);

      const cartItems = orderData.cart.cartItems;

      const selectedItems = cartItems.map((item) =>
        CartItem.create({
          menuItemId: new Types.ObjectId(item.cartItemId),
          quantity: item.quantity,
          subTotal: item.subTotal,
          customizations: item.customizations,
          audit,
        }).getValue(),
      );
      const selectedCartItemsDataModel = selectedItems.map((item) =>
        this.cartItemMapper.toPersistence(item),
      );
      const insertedItems = await this.cartItemRepository.insertManyWithSession(
        selectedCartItemsDataModel,
      );
      if (!insertedItems.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Could not create an order`,
        );
      }

      const cartAudit = Audit.createInsertContext(context);
      const cart = Cart.create({
        userId: contextUser.id,
        totalPrice: orderData.cart.totalPrice,
        cartItems: selectedItems,
        audit: cartAudit,
      }).getValue();
      const cartDataModel = this.cartMapper.toPersistence(cart);
      const insertedCart = await this.cartRepository.create(cartDataModel);
      if (!insertedCart.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Could not create cart`,
        );
      }

      const order = Order.create({
        userId: contextUser.id,
        restaurantId: new Types.ObjectId(restaurantId),
        deliveryAddress: orderData.deliveryAddress,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        totalPrice: orderData.cart.totalPrice,
        cart: insertedCart.getValue(),
        audit,
      }).getValue();
      const orderDataModel = this.orderMapper.toPersistence(order);
      const savedOrder = await this.orderRepository.createOrder(orderDataModel);
      if (!savedOrder.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Could not create order`,
        );
      }
      await session.commitTransaction();
      return Result.ok(OrderParser.createOrderResponse(savedOrder.getValue()));
    } catch (error) {
      await session.abortTransaction();
      return Result.fail(
        'Failed to create order.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await session.endSession();
    }
  }

  async cancelOrder(
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
    if (contextUser.id.toString() !== order.getValue().userId.toString()) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'You do not have permission to cancel this order',
      );
    }
    if (order.getValue().status !== OrderStatus.PENDING) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Order status must be "PENDING" to cancel',
      );
    }

    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      status: OrderStatus.CANCELLED,
    };

    this.updateOrder(data, order.getValue(), context);
    await this.updateOrderById(orderId, data);

    return Result.ok(OrderParser.createOrderResponse(order.getValue()));
  }

  async acceptOrder(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'The order with the provided ID was not found',
      );
    }
    const orderRestaurantId = order.getValue().restaurantId;
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const adminRestaurantId = restaurant.id;

    if (adminRestaurantId.toString() !== orderRestaurantId.toString()) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'You do not have permission to accept this order',
      );
    }
    if (order.getValue().status !== OrderStatus.PENDING) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Order status must be "PENDING" to accept',
      );
    }
    const context = this.contextService.getContext();
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      status: OrderStatus.ACCEPTED,
    };

    this.updateOrder(data, order.getValue(), context);
    await this.updateOrderById(orderId, data);

    return Result.ok(OrderParser.createOrderResponse(order.getValue()));
  }

  async orderPrepared(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'The order with the provided ID was not found',
      );
    }
    const orderRestaurantId = order.getValue().restaurantId;
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const adminRestaurantId = restaurant.id;

    if (adminRestaurantId.toString() !== orderRestaurantId.toString()) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'You do not have permission to accept this order',
      );
    }
    if (order.getValue().status !== OrderStatus.ACCEPTED) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Order status must be "ACCEPTED" to set prepared',
      );
    }
    const context = this.contextService.getContext();
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      status: OrderStatus.PREPARED,
    };

    this.updateOrder(data, order.getValue(), context);
    await this.updateOrderById(orderId, data);
    return Result.ok(OrderParser.createOrderResponse(order.getValue()));
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

    const deliveryPersonId = order.getValue()
      .deliveryPersonId as Types.ObjectId;
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

    const freed =
      await this.deliveryPersonService.markAsAvailable(deliveryPersonId);
    if (!freed.isSuccess) {
      throwApplicationError(
        HttpStatus.EXPECTATION_FAILED,
        'Failed to update delivery person availability.',
      );
    }

    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      deliveryPersonId: null,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    };

    this.updateOrder(data, order.getValue(), context);
    await this.updateOrderById(orderId, data);
    return Result.ok(OrderParser.createOrderResponse(order.getValue()));
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
      const available = await this.deliveryPersonService.pickFromRestaurant(
        deliveryPersonId,
        restaurant.id,
      );
      if (!available) {
        throwApplicationError(
          HttpStatus.EXPECTATION_FAILED,
          'Delivery person unavailable.',
        );
      }
      const assigned =
        await this.deliveryPersonService.markAsAssigned(deliveryPersonId);
      if (!assigned) {
        throwApplicationError(
          HttpStatus.EXPECTATION_FAILED,
          'Failed to assign delivery person.',
        );
      }
    } else {
      if (contextUser.role !== Role.DELIVERY_COMPANY_ADMINISTRATOR) {
        throwApplicationError(
          HttpStatus.FORBIDDEN,
          'Only the delivery company administrator can assign.',
        );
      }

      const available =
        await this.deliveryPersonService.pickFromSystem(deliveryPersonId);
      if (!available) {
        throwApplicationError(
          HttpStatus.EXPECTATION_FAILED,
          'No delivery person available.',
        );
      }
      const assigned =
        await this.deliveryPersonService.markAsAssigned(deliveryPersonId);
      if (!assigned) {
        throwApplicationError(
          HttpStatus.EXPECTATION_FAILED,
          'Failed to assign delivery person.',
        );
      }
    }

    const deliveryPerson =
      await this.deliveryPersonService.getDeliveryPersonById(deliveryPersonId);
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      deliveryPersonId: deliveryPersonId,
      status: OrderStatus.OUT_FOR_DELIVERY,
      deliveryPerson: deliveryPerson,
    };

    this.updateOrder(data, order.getValue(), context);
    await this.updateOrderById(orderId, data);

    return Result.ok(OrderParser.createOrderResponse(order.getValue()));
  }

  private updateOrder(data: any, order: Order, context: Context) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in order) {
        (order as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, order);
  }

  private async updateOrderById(id: Types.ObjectId, data: any) {
    const updatedOrderResult = await this.orderRepository.updateOrder(id, data);
    if (!updatedOrderResult.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_MODIFIED,
        'Order could not be updated',
      );
    }
    return updatedOrderResult.getValue();
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
    const orderResult = await this.orderRepository.getOrderById(orderId);

    if (!orderResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Order not found');
    }

    const order = orderResult.getValue();

    if (order.restaurantId.toString() !== adminRestaurantId.toString()) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        'Access denied to this order',
      );
    }

    const response = OrderParser.createOrderResponse(order);
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
    const orderResult = await this.orderRepository.getOrderById(orderId);

    if (!orderResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Order not found');
    }

    const order = orderResult.getValue();

    if (order.userId.toString() !== user.id.toString()) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        'Access denied to this order',
      );
    }

    const response = OrderParser.createOrderResponse(order);
    return Result.ok(response);
  }
}
