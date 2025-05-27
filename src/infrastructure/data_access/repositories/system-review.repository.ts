import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { SystemReviewDataModel, SystemReviewDocument } from './schemas/system-review.schema';
import { SystemReview } from 'src/system-review/system-review';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';
import { SystemReviewMapper } from 'src/system-review/system-review.mapper';
import { ISystemReviewRepository } from './interfaces/system-review-repository.interface';

@Injectable()
export class SystemReviewRepository
  extends GenericDocumentRepository<SystemReview, SystemReviewDocument>
  implements ISystemReviewRepository
{
  constructor(
    @InjectModel(SystemReviewDataModel.name)
    systemReviewModel: Model<SystemReviewDocument>,
    @InjectConnection() connection: Connection,
    mapper: SystemReviewMapper,
  ) {
    super(systemReviewModel, connection, mapper);
  }

  async createSystemReview(model: SystemReviewDataModel): Promise<Result<SystemReview>> {
    const created = await this.DocumentModel.create(model);
    if (!created) {
      return Result.fail('Failed to create system review', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const systemReview = this.mapper.toDomain(created);
    return Result.ok(systemReview);
  }

  async deleteSystemReview(id: Types.ObjectId): Promise<Result<void>> {
    const deleted = await this.DocumentModel.deleteOne({ _id: id }).exec();
    if (deleted.deletedCount === 0) {
      return Result.fail('System review not found', HttpStatus.NOT_FOUND);
    }
    return Result.ok(undefined, 'System review deleted successfully');
  }

  async getSystemReviewById(id: Types.ObjectId): Promise<Result<SystemReview>> {
    const document = await this.DocumentModel.findById(id).exec();
    if (!document) {
      return Result.fail('System review not found', HttpStatus.NOT_FOUND);
    }
    const systemReview = this.mapper.toDomain(document);
    return Result.ok(systemReview);
  }

  async updateSystemReviewById(
    id: Types.ObjectId,
    updateData: Partial<SystemReviewDataModel>,
  ): Promise<Result<SystemReview>> {
    console.log(updateData, "updateData");
    const updated = await this.DocumentModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).exec();

    if (!updated) {
      return Result.fail('Failed to update system review', HttpStatus.NOT_FOUND);
    }
    const systemReview = this.mapper.toDomain(updated);
    return Result.ok(systemReview);
  }

  async getAllSystemReviews(): Promise<Result<SystemReview[]>> {
    const documents = await this.DocumentModel.find({}).exec();
    if (!documents || documents.length === 0) {
      return Result.fail('No system reviews found', HttpStatus.NOT_FOUND);
    }
    const systemReviews = documents.map(doc => this.mapper.toDomain(doc));
    return Result.ok(systemReviews);
  }

  async getSystemReviewByUserId(userId: Types.ObjectId): Promise<Result<SystemReview>> {
    const document = await this.DocumentModel.findOne({ userId }).exec();
    if (!document) {
      return Result.fail('System review not found for user', HttpStatus.NOT_FOUND);
    }
    const systemReview = this.mapper.toDomain(document);
    return Result.ok(systemReview);
  }
}
