import { Injectable } from '@nestjs/common';
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
    const { userId, restaurantId } = entity;
    const document: RestaurantReviewDataModel = {
      _id: id,
      userId,
      restaurantId,
      rating,
      reviewText,
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
    const { _id, userId, userDetails, restaurantId, rating, reviewText } =
      model;
    if (!userDetails) {
      throw new Error('Restaurant review author relationship was not loaded');
    }
    const entity: RestaurantReview = RestaurantReview.create(
      {
        userId,
        user: this.userMapper.toDomain(userDetails),
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
