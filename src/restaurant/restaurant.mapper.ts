import { Injectable } from '@nestjs/common';
import { RestaurantDataModel } from 'src/infrastructure/data_access/repositories/schemas/restaurant.schema';
import { AuditMapper } from '../audit/audit.mapper';
import { IMapper } from '../domain/mapper/mapper';
import { Restaurant } from './restaurant';
import { MenuMapper } from 'src/menu/menu.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { CompanyMapper } from 'src/company/company.mapper';

@Injectable()
export class RestaurantMapper
  implements IMapper<Restaurant, RestaurantDataModel>
{
  constructor(
    private readonly auditMapper: AuditMapper,
    private readonly restaurantReviewMapper: RestaurantReviewMapper,
    private readonly menuMapper: MenuMapper,
    private readonly userMapper: UserMapper,
    private readonly companyMapper: CompanyMapper,
  ) {}

  toPersistence(entity: Restaurant): RestaurantDataModel {
    const {
      id: _id,
      name,
      description,
      savedAddress,
      phoneNumber,
      companyId,
      deliveryPersonAvailability,
      restaurantAdminId,
      status,
      openingHours,
      closingHours,
      image,
      logo,
      audit,
    } = entity;

    return {
      _id,
      name,
      description,
      savedAddress,
      phoneNumber,
      companyId,
      deliveryPersonAvailability,
      restaurantAdminId,
      status,
      openingHours,
      closingHours,
      image,
      logo,
      auditCreatedBy: audit.auditCreatedBy,
      auditCreatedDateTime: audit.auditCreatedDateTime,
      auditModifiedBy: audit.auditModifiedBy,
      auditModifiedDateTime: audit.auditModifiedDateTime,
      auditDeletedBy: audit.auditDeletedBy,
      auditDeletedDateTime: audit.auditDeletedDateTime,
    };
  }

  toDomain(doc: any): Restaurant {
    const {
      _id,
      name,
      description,
      savedAddress,
      phoneNumber,
      companyId,
      companyDetails,
      deliveryPersonAvailability,
      reviewsDetail,
      menusDetail,
      restaurantAdminDetails,
      restaurantAdminId,
      status,
      openingHours,
      closingHours,
      image,
      logo,
    } = doc;
    if (!companyDetails) {
      throw new Error('Restaurant company relationship was not loaded');
    }
    if (!restaurantAdminDetails) {
      throw new Error('Restaurant administrator relationship was not loaded');
    }

    const entity = Restaurant.create(
      {
        name,
        description,
        savedAddress,
        phoneNumber,
        companyId,
        company: this.companyMapper.toDomain(companyDetails),
        deliveryPersonAvailability,
        reviews: reviewsDetail
          ? reviewsDetail.map((r) => this.restaurantReviewMapper.toDomain(r))
          : [],
        menus: menusDetail
          ? menusDetail.map((m) => this.menuMapper.toDomain(m))
          : [],
        restaurantAdminId,
        restaurantAdmin: this.userMapper.toDomain(restaurantAdminDetails),
        status,
        openingHours,
        closingHours,
        image,
        logo,
        audit: this.auditMapper.toDomain(doc),
      },
      _id,
    ).getValue();

    return entity;
  }
}
