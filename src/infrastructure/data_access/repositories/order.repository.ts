import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
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
  private readonly orderPopulation = [
    {
      path: 'cart',
      populate: {
        path: 'cartItems',
        populate: {
          path: 'menuItemId',
        },
      },
    },
    {
      path: 'deliveryPersonId',
    },
  ];

  constructor(
    @InjectModel(OrderDataModel.name) orderDataModel: Model<OrderDocument>,
    @InjectConnection() readonly connection: Connection,
    private readonly orderMapper: OrderMapper,
  ) {
    super(orderDataModel, connection, orderMapper);
  }

  async createOrder(
    orderData: OrderDataModel,
    options?: { session?: ClientSession },
  ): Promise<Result<Order>> {
    const orderDocument = new this.DocumentModel(orderData);
    const createdOrder = await orderDocument.save(options);

    if (!createdOrder) {
      return Result.fail(
        'An error occurred, unable to save Order in the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await createdOrder.populate(this.orderPopulation);
    const order = this.orderMapper.toDomain(createdOrder);
    return Result.ok(order);
  }

  async getOrders(filter?: Partial<OrderDataModel>): Promise<Result<Order[]>> {
    const documents = await this.DocumentModel.find(filter || {})
      .populate(this.orderPopulation)
      .exec();

    if (documents.length > 0) {
      const orders = documents.map((doc) => this.orderMapper.toDomain(doc));
      return Result.ok(orders);
    }

    return Result.fail('No orders found', HttpStatus.NOT_FOUND);
  }

  async getOrderByRestaurant(restaurantId: string): Promise<Result<Order[]>> {
    const documents = await this.DocumentModel.find({ restaurantId })
      .populate(this.orderPopulation)
      .exec();

    if (documents.length > 0) {
      const orders = documents.map((doc) => this.orderMapper.toDomain(doc));
      return Result.ok(orders);
    }

    return Result.fail(
      'No orders found for this restaurant',
      HttpStatus.NOT_FOUND,
    );
  }

  async getOrderById(id: Types.ObjectId): Promise<Result<Order>> {
    const orderDocument = await this.DocumentModel.findOne({ _id: id })
      .populate(this.orderPopulation)
      .exec();
    if (!orderDocument) {
      return Result.fail(
        'Error getting document from database',
        HttpStatus.NOT_FOUND,
      );
    }
    const order = this.orderMapper.toDomain(orderDocument);
    return Result.ok(order);
  }

  async transitionOrder(
    orderId: Types.ObjectId,
    expectedStatus: OrderDataModel['status'],
    updateData: Partial<OrderDataModel>,
    options?: { session?: ClientSession },
  ): Promise<Result<Order>> {
    const updatedDocument = await this.DocumentModel.findOneAndUpdate(
      {
        _id: orderId,
        status: expectedStatus,
      },
      { $set: updateData },
      {
        new: true,
        session: options?.session,
      },
    )
      .populate(this.orderPopulation)
      .exec();

    if (!updatedDocument) {
      return Result.fail(
        `Order is no longer in ${expectedStatus} status`,
        HttpStatus.CONFLICT,
      );
    }

    return Result.ok(this.orderMapper.toDomain(updatedDocument));
  }
}
