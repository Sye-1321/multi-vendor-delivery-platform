import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { IOrderResponseDTO } from '../dtos/order-response.dto';
import { CreateOrderDTO } from '../dtos/order.dto';
import { CancelOrderDTO } from '../dtos/cancel-order.dto';

export interface IOrderService {
  createOrder(
    restaurantId: Types.ObjectId,
    orderData: CreateOrderDTO,
  ): Promise<Result<IOrderResponseDTO>>;
  cancelOrder(
    orderId: Types.ObjectId,
    request: CancelOrderDTO,
  ): Promise<Result<IOrderResponseDTO>>;
  acceptOrder(orderId: Types.ObjectId): Promise<Result<IOrderResponseDTO>>;
  orderPrepared(orderId: Types.ObjectId): Promise<Result<IOrderResponseDTO>>;
  markDelivered(orderId: Types.ObjectId): Promise<Result<IOrderResponseDTO>>;
  assignDeliveryPerson(
    orderId: Types.ObjectId,
    deliveryPersonId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>>;
  getOrdersByUser(): Promise<Result<IOrderResponseDTO[]>>;
  getRestaurantOrders(): Promise<Result<IOrderResponseDTO[]>>;
  getRestaurantOrderById(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>>;
  getAllOrders(): Promise<Result<IOrderResponseDTO[]>>;
  getOrderById(orderId: Types.ObjectId): Promise<Result<IOrderResponseDTO>>;
  getOrderByIdForCurrentUser(
    orderId: Types.ObjectId,
  ): Promise<Result<IOrderResponseDTO>>;
}
