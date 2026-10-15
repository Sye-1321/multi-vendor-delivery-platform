import { Order } from 'src/order/order';
import { OrderDataModel, OrderDocument } from '../schemas/order.schema';
import { ClientSession, Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';
import { IOrderTransition } from 'src/order/interfaces/order.interface';
import { PaginationOptions } from 'src/shared/interfaces/shared.interface';

export interface IOrderRepository
  extends IGenericDocument<Order, OrderDocument> {
  createOrder(
    orderData: OrderDataModel,
    options?: { session?: ClientSession },
  ): Promise<Result<Order>>;
  getOrders(
    filter?: Partial<OrderDataModel>,
    pagination?: PaginationOptions,
  ): Promise<Result<Order[]>>;
  getOrderByIdempotencyKey(
    userId: Types.ObjectId,
    idempotencyKey: string,
  ): Promise<Result<Order>>;
  getOrderById(
    id: Types.ObjectId,
    scope?: Partial<OrderDataModel>,
  ): Promise<Result<Order>>;
  transitionOrder(
    orderId: Types.ObjectId,
    expectedStatus: OrderDataModel['status'],
    updateData: Partial<OrderDataModel>,
    transition: IOrderTransition,
    options?: { session?: ClientSession },
  ): Promise<Result<Order>>;
}
