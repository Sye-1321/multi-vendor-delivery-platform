import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TYPES } from './../application/constants/types';
import { DeliveryPersonController } from './delivery-person.controller';
import { DeliveryPersonMapper } from './delivery-person.mapper';
import { DeliveryPersonRepository } from 'src/infrastructure/data_access/repositories/deliveryperson.repository';
import {
  DeliveryPersonDataModel,
  DeliveryPersonSchema,
} from 'src/infrastructure/data_access/repositories/schemas/delivery-person.schema';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant.schema';
import { ContextMiddleWare } from 'src/infrastructure/middlewares/context.middleware';
import { DeliveryPersonService } from './delivery-person.service';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { EmailService } from 'src/infrastructure/email/email-service';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { ContextService } from 'src/infrastructure/context/context.service';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import { AuditMapper } from 'src/audit/audit.mapper';
import { MenuMapper } from 'src/menu/menu.mapper';
import { CompanyMapper } from 'src/company/company.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { RestaurantRepository } from 'src/infrastructure/data_access/repositories/restaurant.repository';
import { CompanyService } from 'src/company/company.service';
import { CompanyRepository } from 'src/infrastructure/data_access/repositories/company.repository';
import {
  CompanyDataModel,
  CompanySchema,
} from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryPersonDataModel.name, schema: DeliveryPersonSchema },
      { name: UserDataModel.name, schema: UserSchema },
      { name: RestaurantDataModel.name, schema: RestaurantSchema },
      { name: CompanyDataModel.name, schema: CompanySchema },
    ]),
  ],
  controllers: [DeliveryPersonController],
  providers: [
    {
      provide: TYPES.IDeliveryPersonRepository,
      useClass: DeliveryPersonRepository,
    },
    { provide: TYPES.IDeliveryPersonService, useClass: DeliveryPersonService },
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IContextService, useClass: ContextService },
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    { provide: TYPES.IRestaurantService, useClass: RestaurantService },
    { provide: TYPES.IRestaurantRepository, useClass: RestaurantRepository },
    { provide: TYPES.ICompanyService, useClass: CompanyService },
    { provide: TYPES.ICompanyRepository, useClass: CompanyRepository },
    DeliveryPersonMapper,
    RestaurantMapper,
    AuditMapper,
    MenuMapper,
    MenuItemMapper,
    CompanyMapper,
    UserMapper,
    RestaurantReviewMapper,
    JwtService,
    UserRepository,
    DeliveryPersonRepository,
  ],
})
export class DeliveryPersonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleWare).forRoutes(DeliveryPersonController);
  }
}
