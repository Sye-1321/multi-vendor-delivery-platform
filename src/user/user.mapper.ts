import { Injectable } from '@nestjs/common';
import { UserDataModel } from '../infrastructure/data_access/repositories/schemas/user.schema';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { User } from './user';

@Injectable()
export class UserMapper implements IMapper<User, UserDataModel> {
  constructor(private readonly auditMapper: AuditMapper) {}
  toPersistence(entity: User): UserDataModel {
    const document: UserDataModel = {
      _id: entity.id,
      name: entity.name,
      email: entity.email,
      phoneNumber: entity.phoneNumber,
      passwordHash: entity.passwordHash,
      role: entity.role,
      status: entity.status,
      savedAddress: entity.savedAddress
        ? {
            city: entity.savedAddress.city,
            subCity: entity.savedAddress.subCity,
          }
        : { city: '', subCity: '' },
      refreshTokenHash: entity.refreshTokenHash as string,
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditModifiedBy: entity.audit.auditModifiedBy,
      auditModifiedDateTime: entity.audit.auditModifiedDateTime,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
      auditDeletedBy: entity.audit.auditDeletedBy,
    };
    return document;
  }

  toDomain(doc: UserDataModel): User {
    const {
      _id,
      name,
      email,
      phoneNumber,
      passwordHash,
      refreshTokenHash,
      role,
      status,
      savedAddress,
    } = doc;
    const entity: User = User.create(
      {
        name,
        email,
        phoneNumber,
        passwordHash,
        refreshTokenHash,
        role,
        savedAddress,
        status,
        audit: this.auditMapper.toDomain(doc),
      },
      _id,
    ).getValue();
    return entity;
  }
}
