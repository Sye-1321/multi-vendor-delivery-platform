import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { IMapper } from '../domain/mapper/mapper';
import { AuditMapper } from '../audit/audit.mapper';
import { RestaurantReviewDataModel } from 'src/infrastructure/data_access/repositories/schemas/restaurant-review.schema';
import { RestaurantReview } from './restaurant-review';
import { UserMapper } from 'src/user/user.mapper';

@Injectable()
export class RestaurantReviewMapper
  implements IMapper<RestaurantReview, RestaurantReviewDataModel>
{
  constructor(
    private readonly auditMapper: AuditMapper,
    private readonly userMapper: UserMapper,
  ) {}

  toPersistence(entity: RestaurantReview): RestaurantReviewDataModel {
    const { id, reviewText, rating } = entity;
    const userId: Types.ObjectId = entity.user.id;
    const restaurantId: Types.ObjectId = entity.restaurantId;
    const document: RestaurantReviewDataModel = {
      _id: id,
      userId,
      restaurantId,
      rating,
      reviewText,
      user: this.userMapper.toPersistence(entity.user),
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditModifiedBy: entity.audit.auditModifiedBy,
      auditModifiedDateTime: entity.audit.auditModifiedDateTime,
      auditDeletedBy: entity.audit.auditDeletedBy,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
    };
    return document;
  }

  toDomain(model: RestaurantReviewDataModel): RestaurantReview {
    const { _id, userId, user, restaurantId, rating, reviewText } = model;
    const entity: RestaurantReview = RestaurantReview.create(
      {
        userId,
        user: this.userMapper.toDomain(user),
        restaurantId,
        rating,
        reviewText,
        audit: this.auditMapper.toDomain(model),
      },
      _id,
    ).getValue();

    return entity;
  }
}
