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
  UseGuards,
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

@Controller('orders')
export class OrderController {
  constructor(
    @Inject(TYPES.IOrderService)
    private readonly orderService: IOrderService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.CREATED)
  @Post(':restaurantId')
  async createOrder(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Body() orderData: CreateOrderDTO,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.createOrder(restaurantId, orderData);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.OK)
  @Patch(':orderId/cancel')
  async cancelOrder(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
    @Body() request: CancelOrderDTO,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.cancelOrder(orderId, request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch(':orderId/accept')
  async acceptOrder(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.acceptOrder(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch(':orderId/prepared')
  async orderPrepared(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.orderPrepared(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR, Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch(':orderId/delivered')
  async markDelivered(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.markDelivered(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR, Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch(':orderId/assign-delivery-person/:deliveryPersonId')
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
  @Get('user/orders')
  async getOrdersByUser(): Promise<Result<IOrderResponseDTO[]>> {
    return await this.orderService.getOrdersByUser();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('restaurant/orders')
  async getRestaurantOrders(): Promise<Result<IOrderResponseDTO[]>> {
    return await this.orderService.getRestaurantOrders();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('restaurant/orders/:orderId')
  async getRestaurantOrderById(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.getRestaurantOrderById(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('all')
  async getAllOrders(): Promise<Result<IOrderResponseDTO[]>> {
    return await this.orderService.getAllOrders();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get(':orderId')
  async getOrderById(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.getOrderById(orderId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.OK)
  @Get('user/orders/:orderId')
  async getOrderByIdForCurrentUser(
    @Param('orderId', ParseObjectIdPipe) orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>> {
    return await this.orderService.getOrderByIdForCurrentUser(orderId);
  }
}
