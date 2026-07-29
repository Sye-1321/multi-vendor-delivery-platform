import { Injectable } from '@nestjs/common';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { DeliveryPersonDataModel } from 'src/infrastructure/data_access/repositories/schemas/delivery-person.schema';
import { DeliveryPerson } from './delivery-person';

@Injectable()
export class DeliveryPersonMapper
  implements IMapper<DeliveryPerson, DeliveryPersonDataModel>
{
  constructor(private readonly auditMapper: AuditMapper) {}

  toPersistence(entity: DeliveryPerson): DeliveryPersonDataModel {
    const {
      id,
      profileImage,
      name,
      phoneNumber,
      availabilityStatus,
      status,
      deliveryType,
      restaurantId,
      savedAddress,
    } = entity;

    const document: DeliveryPersonDataModel = {
      _id: id,
      profileImage,
      name,
      phoneNumber,
      availabilityStatus,
      status,
      deliveryType,
      savedAddress,
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditModifiedBy: entity.audit.auditModifiedBy,
      auditModifiedDateTime: entity.audit.auditModifiedDateTime,
      auditDeletedBy: entity.audit.auditDeletedBy,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
      restaurantId: restaurantId ?? null,
    };

    return document;
  }

  toDomain(document: any): DeliveryPerson {
    const {
      _id,
      profileImage,
      name,
      phoneNumber,
      availabilityStatus,
      status,
      deliveryType,
      restaurantId,
      savedAddress,
    } = document;

    const entity: DeliveryPerson = new DeliveryPerson(_id, {
      profileImage,
      name,
      phoneNumber,
      availabilityStatus,
      status,
      deliveryType,
      restaurantId,
      savedAddress,
      audit: this.auditMapper.toDomain(document),
    });

    return entity;
  }
}
