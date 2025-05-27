import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Order } from 'src/order/order';
import { OrderMapper } from 'src/order/order.mapper';
import { IOrderRepository } from './interfaces/order-repository';
import { OrderDataModel, OrderDocument } from './schemas/order.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';

@Injectable()
export class OrderRepository 
  extends GenericDocumentRepository<Order, OrderDocument>
  implements IOrderRepository
{
  constructor(
    @InjectModel(OrderDataModel.name) orderDataModel: Model<OrderDocument>,
    @InjectConnection() readonly connection: Connection,
    private readonly orderMapper: OrderMapper,
  ) {
    super(orderDataModel, connection, orderMapper);
  }

  async createOrder(orderData: OrderDataModel): Promise<Result<Order>> {
    const createdOrder = await this.DocumentModel.create(orderData);
    if (!createdOrder) {
      return Result.fail('An error occurred, unable to save Order in the database', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const order = this.orderMapper.toDomain(createdOrder);
    return Result.ok(order);
  }

  async getOrders(filter?: Partial<OrderDataModel>): Promise<Result<Order[]>> {
  const documents = await this.DocumentModel.find(filter || {})
    .populate('cart.cartItems.menuItemId')
    .exec();

  if (documents.length > 0) {
    const orders = documents.map((doc) => this.orderMapper.toDomain(doc));
    return Result.ok(orders);
  }

  return Result.fail('No orders found', HttpStatus.NOT_FOUND);
  }

  async getOrderByRestaurant(restaurantId: string): Promise<Result<Order[]>> {
    const documents = await this.DocumentModel.find({ restaurantId })
      .populate('cart.cartItems.menuItemId')
      .exec();

    if (documents.length > 0) {
      const orders = documents.map((doc) => this.orderMapper.toDomain(doc));
      return Result.ok(orders);
    }

    return Result.fail('No orders found for this restaurant', HttpStatus.NOT_FOUND);
  }

  async getOrderById(id: Types.ObjectId): Promise<Result<Order>> {
    const orderDocument = await this.DocumentModel.findOne({ _id: id }).exec();
    if (!orderDocument) {
      return Result.fail('Error getting document from database', HttpStatus.NOT_FOUND);
    }
    const order = this.orderMapper.toDomain(orderDocument);
    return Result.ok(order);
  }

  async updateOrder(orderId: Types.ObjectId, updateData: any): Promise<Result<Order>> {
    const updatedDocument = await this.DocumentModel.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    ).exec();
    if (!updatedDocument) {
      return Result.fail('Error while updating order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const updatedOrder = this.orderMapper.toDomain(updatedDocument);
    return Result.ok(updatedOrder);
  }
}
