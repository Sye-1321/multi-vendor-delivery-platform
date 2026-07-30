import { Injectable } from '@nestjs/common';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { CompanyDataModel } from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import { Company } from './company';
import { Types } from 'mongoose';
import { UserMapper } from 'src/user/user.mapper';

@Injectable()
export class CompanyMapper implements IMapper<Company, CompanyDataModel> {
  constructor(
    private readonly auditMapper: AuditMapper,
    private readonly userMapper: UserMapper,
  ) {}

  toPersistence(entity: Company): CompanyDataModel {
    const { id, logo, name, phoneNumber, savedAddress } = entity;
    const ownerId: Types.ObjectId = entity.owner.id;
    const document: CompanyDataModel = {
      _id: id,
      logo,
      name,
      phoneNumber,
      ownerId,
      owner: this.userMapper.toPersistence(entity.owner),
      savedAddress,
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditModifiedBy: entity.audit.auditModifiedBy,
      auditModifiedDateTime: entity.audit.auditModifiedDateTime,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
      auditDeletedBy: entity.audit.auditDeletedBy,
    };
    return document;
  }

  toDomain(document: any): Company {
    const { _id, logo, name, phoneNumber, ownerId, owner, savedAddress } =
      document;
    const entity: Company = Company.create(
      {
        logo,
        name,
        phoneNumber,
        ownerId,
        owner: this.userMapper.toDomain(owner),
        savedAddress,
        audit: this.auditMapper.toDomain(document),
      },
      _id,
    ).getValue();
    return entity;
  }
}
