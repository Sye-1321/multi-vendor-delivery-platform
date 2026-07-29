import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
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
    const { id, reviewText, rating, user } = entity;
    const userId: Types.ObjectId = user.id;
    const document: SystemReviewDataModel = {
      _id: id,
      userId,
      rating,
      reviewText,
      user: this.userMapper.toPersistence(user),
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
    const { _id, userId, user, rating, reviewText } = model;

    const entity: SystemReview = SystemReview.create(
      {
        userId,
        user: this.userMapper.toDomain(user),
        rating,
        reviewText,
        audit: this.auditMapper.toDomain(model),
      },
      _id,
    ).getValue();

    return entity;
  }
}
