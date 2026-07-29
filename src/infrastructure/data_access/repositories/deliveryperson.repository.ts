import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types, FilterQuery } from 'mongoose';
import {
  DeliveryPersonDataModel,
  DeliveryPersonDocument,
} from './schemas/delivery-person.schema';
import { DeliveryPerson } from 'src/delivery-person/delivery-person';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';
import { Result } from 'src/domain/result/result';

@Injectable()
export class DeliveryPersonRepository extends GenericDocumentRepository<
  DeliveryPerson,
  DeliveryPersonDocument
> {
  constructor(
    @InjectModel(DeliveryPersonDataModel.name)
    deliveryPersonModel: Model<DeliveryPersonDocument>,
    @InjectConnection() connection: Connection,
    @Inject(DeliveryPersonMapper)
    private readonly deliveryPersonMapper: DeliveryPersonMapper,
  ) {
    super(deliveryPersonModel, connection, deliveryPersonMapper);
  }

  async getDeliveryPersonById(
    id: Types.ObjectId,
  ): Promise<Result<DeliveryPerson>> {
    const deliveryPersonDocument = await this.DocumentModel.findById(id)
      .lean()
      .exec();
    if (!deliveryPersonDocument) {
      return Result.fail('Delivery person not found', HttpStatus.NOT_FOUND);
    }
    const deliveryPerson: DeliveryPerson = this.deliveryPersonMapper.toDomain(
      deliveryPersonDocument,
    );
    return Result.ok(deliveryPerson);
  }

  async createDeliveryPerson(
    model: DeliveryPersonDataModel,
  ): Promise<Result<DeliveryPerson>> {
    const created = await this.DocumentModel.create(model);
    if (!created) {
      return Result.fail(
        'Failed to create delivery person',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const deliveryPerson: DeliveryPerson =
      this.deliveryPersonMapper.toDomain(created);
    return Result.ok(deliveryPerson);
  }

  async findByPhoneNumber(
    phoneNumber: string,
  ): Promise<Result<DeliveryPerson>> {
    const doc = await this.DocumentModel.findOne({ phoneNumber }).exec();
    if (!doc) {
      return Result.fail(
        'Delivery person not found with this phone number',
        HttpStatus.NOT_FOUND,
      );
    }
    const deliveryPerson = this.deliveryPersonMapper.toDomain(doc);
    return Result.ok(deliveryPerson);
  }

  async getDeliveryPersons(
    filter: FilterQuery<DeliveryPerson>,
  ): Promise<Result<DeliveryPerson[]>> {
    const docs = await this.DocumentModel.find(filter).exec();
    if (!docs) {
      return Result.fail(
        'Error fetching delivery persons',
        HttpStatus.NOT_FOUND,
      );
    }
    const mapped = docs.map((doc) => this.deliveryPersonMapper.toDomain(doc));
    return Result.ok(mapped);
  }

  async deleteDeliveryPerson(id: Types.ObjectId): Promise<Result<void>> {
    const deleted = await this.DocumentModel.deleteOne({ _id: id }).exec();
    if (deleted.deletedCount === 0) {
      return Result.fail('Delivery person not found', HttpStatus.NOT_FOUND);
    }
    return Result.ok(undefined, 'Delivery person deleted successfully');
  }

  async getDeliveryPersonsByRestaurantId(
    restaurantId: Types.ObjectId,
  ): Promise<Result<DeliveryPerson[]>> {
    const docs = await this.DocumentModel.find({ restaurantId }).exec();
    if (!docs.length) {
      return Result.fail(
        'No delivery persons found for this restaurant',
        HttpStatus.NOT_FOUND,
      );
    }
    const mapped = docs.map((doc) => this.deliveryPersonMapper.toDomain(doc));
    return Result.ok(mapped);
  }

  async updateDeliveryPersonById(
    id: Types.ObjectId,
    updateData: Partial<DeliveryPersonDataModel>,
  ): Promise<Result<DeliveryPerson>> {
    const updated = await this.DocumentModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).exec();

    if (!updated) {
      return Result.fail(
        'Failed to update delivery person',
        HttpStatus.NOT_FOUND,
      );
    }

    const mapped = this.deliveryPersonMapper.toDomain(updated);
    return Result.ok(mapped);
  }

  async getSystemWideDeliveryPersons(): Promise<Result<DeliveryPerson[]>> {
    const docs = await this.DocumentModel.find({
      deliveryType: 'SYSTEM',
    }).exec();
    if (!docs.length) {
      return Result.fail(
        'No system-wide delivery persons found',
        HttpStatus.NOT_FOUND,
      );
    }
    const mapped = docs.map((doc) => this.deliveryPersonMapper.toDomain(doc));
    return Result.ok(mapped);
  }

  async getDeliveryPersonByIdAndRestaurantId(
    deliveryPersonId: Types.ObjectId,
    restaurantId: Types.ObjectId,
  ): Promise<Result<DeliveryPerson>> {
    const doc = await this.DocumentModel.findOne({
      _id: deliveryPersonId,
      restaurantId: restaurantId,
    }).exec();

    if (!doc) {
      return Result.fail(
        'Delivery person not found for the given restaurant',
        HttpStatus.NOT_FOUND,
      );
    }

    const mapped = this.deliveryPersonMapper.toDomain(doc);
    return Result.ok(mapped);
  }
}
