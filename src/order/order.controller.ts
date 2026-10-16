import {
  Body,
  Controller,
  Inject,
  Param,
  Patch,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { IOrderService } from './interfaces/order.service.interface';
import { IOrderResponseDTO } from './dtos/order-response.dto';
import { CreateOrderDTO } from './dtos/order.dto';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { Role } from 'src/application/constants/constants';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
import { TYPES } from 'src/application/constants/types';
import { CancelOrderDTO } from './dtos/cancel-order.dto';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import { PaginationQueryDTO } from 'src/shared/dtos/pagination-query.dto';
import { IdempotencyKeyPipe } from './idempotency-key.pipe';
import { ApiConflictResponse, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  ApiEndpoint,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';
import { OrderSchema } from 'src/infrastructure/swagger/swagger.schemas';

@ApiTags('Orders')
@Controller()
export class OrderController {
  constructor(
    @Inject(TYPES.IOrderService)
    private readonly orderService: IOrderService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.CREATED)
  @Post('restaurants/:restaurantId/orders')
  @ApiEndpoint('Create an order for a restaurant', {
    status: 201,
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('restaurantId')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Opaque key (1–128 trimmed characters). Reuse it when retrying the same checkout.',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiConflictResponse({
    description:
      'The idempotency key was already used with a different checkout payload.',
  })
  async createOrder(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Body() orderData: CreateOrderDTO,
    @Headers('idempotency-key') idempotencyKeyHeader: unknown,
  ): Promise<Result<IOrderResponseDTO>> {
    const idempotencyKey = new IdempotencyKeyPipe().transform(
      idempotencyKeyHeader,
    );
    return await this.orderService.createOrder(
      restaurantId,
      orderData,
      idempotencyKey,
    );
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.OK)
  @Patch('orders/:orderId/cancel')
  @ApiEndpoint('Cancel the current customer’s order', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async cancelOrder(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
    @Body() request: CancelOrderDTO,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.cancelOrder(orderId, request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch('orders/:orderId/accept')
  @ApiEndpoint('Accept an order for the managed restaurant', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async acceptOrder(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.acceptOrder(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch('orders/:orderId/prepared')
  @ApiEndpoint('Mark an order as prepared', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async orderPrepared(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.orderPrepared(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR, Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch('orders/:orderId/delivered')
  @ApiEndpoint('Mark an order as delivered', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async markDelivered(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.markDelivered(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR, Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch('orders/:orderId/delivery-person/:deliveryPersonId')
  @ApiEndpoint('Assign a delivery person to an order', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  @mongoIdParam('deliveryPersonId')
  async assignDeliveryPerson(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
    @Param('deliveryPersonId', ParseObjectIdPipe)
    deliveryPersonId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.assignDeliveryPerson(
      orderId,
      deliveryPersonId,
    );
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.OK)
  @Get('users/me/orders')
  @ApiEndpoint('List the current customer’s orders', {
    model: OrderSchema,
    array: true,
    auth: 'access-token',
  })
  async getOrdersByUser(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IOrderResponseDTO[]>> {
    return await this.orderService.getOrdersByUser(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('restaurants/me/orders')
  @ApiEndpoint('List orders for the managed restaurant', {
    model: OrderSchema,
    array: true,
    auth: 'access-token',
  })
  async getRestaurantOrders(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IOrderResponseDTO[]>> {
    return await this.orderService.getRestaurantOrders(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('restaurants/me/orders/:orderId')
  @ApiEndpoint('Get an order for the managed restaurant', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async getRestaurantOrderById(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.getRestaurantOrderById(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('orders')
  @ApiEndpoint('List all orders', {
    model: OrderSchema,
    array: true,
    auth: 'access-token',
  })
  async getAllOrders(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IOrderResponseDTO[]>> {
    return await this.orderService.getAllOrders(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('orders/:orderId')
  @ApiEndpoint('Get any order by ID', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async getOrderById(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.getOrderById(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.OK)
  @Get('users/me/orders/:orderId')
  @ApiEndpoint('Get an order belonging to the current customer', {
    model: OrderSchema,
    auth: 'access-token',
  })
  @mongoIdParam('orderId')
  async getOrderByIdForCurrentUser(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.getOrderByIdForCurrentUser(orderId);
  }
}
