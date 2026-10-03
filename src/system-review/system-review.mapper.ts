import { Injectable } from '@nestjs/common';
import { IMapper } from '../domain/mapper/mapper';
import { AuditMapper } from '../audit/audit.mapper';
import { SystemReviewDataModel } from 'src/infrastructure/data_access/repositories/schemas/system-review.schema';
import { SystemReview } from './system-review';
import { UserMapper } from 'src/user/user.mapper';

@Injectable()
export class SystemReviewMapper
  implements IMapper<SystemReview, SystemReviewDataModel>
{
  constructor(
    private readonly auditMapper: AuditMapper,
    private readonly userMapper: UserMapper,
  ) {}

  toPersistence(entity: SystemReview): SystemReviewDataModel {
    const { id, reviewText, rating, userId } = entity;
    const document: SystemReviewDataModel = {
      _id: id,
      userId,
      rating,
      reviewText,
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditModifiedBy: entity.audit.auditModifiedBy,
      auditModifiedDateTime: entity.audit.auditModifiedDateTime,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
      auditDeletedBy: entity.audit.auditDeletedBy,
    };
    return document;
  }

  toDomain(model: SystemReviewDataModel): SystemReview {
    const { _id, userId, userDetails, rating, reviewText } = model;
    if (!userDetails) {
      throw new Error('System review author relationship was not loaded');
    }

    const entity: SystemReview = SystemReview.create(
      {
        userId,
        user: this.userMapper.toDomain(userDetails),
        rating,
        reviewText,
        audit: this.auditMapper.toDomain(model),
      },
      _id,
    ).getValue();

    return entity;
  }
}
