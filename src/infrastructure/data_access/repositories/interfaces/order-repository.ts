import { Order } from 'src/order/order';
import { OrderDataModel, OrderDocument } from '../schemas/order.schema';
import { ClientSession, Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';

export interface IOrderRepository extends IGenericDocument<Order, OrderDocument> {
  createOrder(orderData: OrderDataModel, options?: { session?: ClientSession }): Promise<Result<Order>>;
  getOrders(filter?: Partial<OrderDataModel>): Promise<Result<Order[]>>;
  getOrderByRestaurant(restaurantId: string): Promise<Result<Order[]>>;
  getOrderById(id: Types.ObjectId): Promise<Result<Order>>;
  updateOrder(orderId: Types.ObjectId, updateData: any): Promise<Result<Order>>;
}
