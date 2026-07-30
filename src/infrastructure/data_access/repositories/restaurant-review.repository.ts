import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  RestaurantReviewDataModel,
  RestaurantReviewDocument,
} from './schemas/restaurant-review.schema';
import { Result } from 'src/domain/result/result';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { RestaurantReview } from 'src/restaurant-review/restaurant-review';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { IRestaurantReviewRepository } from './interfaces/restaurant-review-repository.interface';

@Injectable()
export class RestaurantReviewRepository
  extends GenericDocumentRepository<RestaurantReview, RestaurantReviewDocument>
  implements IRestaurantReviewRepository
{
  constructor(
    @InjectModel(RestaurantReviewDataModel.name)
    restaurantReviewModel: Model<RestaurantReviewDocument>,
    @InjectConnection() connection: Connection,
    @Inject(RestaurantReviewMapper)
    private readonly restaurantReviewMapper: RestaurantReviewMapper,
  ) {
    super(restaurantReviewModel, connection, restaurantReviewMapper);
  }

  async createRestaurantReview(
    model: RestaurantReviewDataModel,
  ): Promise<Result<RestaurantReview>> {
    const created = await this.DocumentModel.create(model);
    if (!created) {
      return Result.fail(
        'Failed to create restaurant review',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const restaurantReview = this.restaurantReviewMapper.toDomain(created);
    return Result.ok(restaurantReview);
  }

  async getRestaurantReviewById(
    id: Types.ObjectId,
  ): Promise<Result<RestaurantReview>> {
    const document = await this.DocumentModel.findById(id).exec();
    if (!document) {
      return Result.fail('System review not found', HttpStatus.NOT_FOUND);
    }
    const restaurantReview = this.restaurantReviewMapper.toDomain(document);
    return Result.ok(restaurantReview);
  }

  async deleteRestaurantReviewById(id: Types.ObjectId): Promise<Result<void>> {
    const deleted = await this.DocumentModel.deleteOne({ _id: id }).exec();
    if (deleted.deletedCount === 0) {
      return Result.fail('Restaurant review not found', HttpStatus.NOT_FOUND);
    }
    return Result.ok(undefined, 'Restaurant review deleted successfully');
  }

  async updateRestaurantReviewById(
    id: Types.ObjectId,
    updateData: Partial<RestaurantReviewDataModel>,
  ): Promise<Result<RestaurantReview>> {
    const updated = await this.DocumentModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).exec();

    if (!updated) {
      return Result.fail(
        'Failed to update restaurant review',
        HttpStatus.NOT_FOUND,
      );
    }
    const restaurantReview = this.restaurantReviewMapper.toDomain(updated);
    return Result.ok(restaurantReview);
  }
}
