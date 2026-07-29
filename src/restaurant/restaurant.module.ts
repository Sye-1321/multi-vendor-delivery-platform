import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TYPES } from './../application/constants/types';
import { AuditMapper } from './../audit/audit.mapper';
import { ContextMiddleWare } from './../infrastructure/middlewares/context.middleware';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant.schema';
import { RestaurantController } from './restaurant.controller';
import { RestaurantRepository } from 'src/infrastructure/data_access/repositories/restaurant.repository';
import { RestaurantService } from './restaurant.service';
import { RestaurantMapper } from './restaurant.mapper';
import { EmailService } from 'src/infrastructure/email/email-service';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { ContextService } from 'src/infrastructure/context/context.service';
import { CompanyService } from 'src/company/company.service';
import { MenuMapper } from 'src/menu/menu.mapper';
import { CompanyMapper } from 'src/company/company.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { CompanyRepository } from 'src/infrastructure/data_access/repositories/company.repository';
import {
  CompanyDataModel,
  CompanySchema,
} from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import {
  MenuDataModel,
  MenuSchema,
} from 'src/infrastructure/data_access/repositories/schemas/menu.schema';
import {
  RestaurantReviewDataModel,
  RestaurantReviewSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant-review.schema';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantDataModel.name, schema: RestaurantSchema },
      { name: UserDataModel.name, schema: UserSchema },
      { name: CompanyDataModel.name, schema: CompanySchema },
      { name: MenuDataModel.name, schema: MenuSchema },
      { name: RestaurantReviewDataModel.name, schema: RestaurantReviewSchema },
    ]),
  ],
  controllers: [RestaurantController],
  providers: [
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IContextService, useClass: ContextService },
    { provide: TYPES.ICompanyRepository, useClass: CompanyRepository },
    { provide: TYPES.ICompanyService, useClass: CompanyService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    { provide: TYPES.IRestaurantRepository, useClass: RestaurantRepository },
    { provide: TYPES.IRestaurantService, useClass: RestaurantService },
    RestaurantMapper,
    AuditMapper,
    MenuMapper,
    CompanyMapper,
    UserMapper,
    RestaurantReviewMapper,
    JwtService,
    UserRepository,
    MenuItemMapper,
  ],
  exports: [TYPES.IRestaurantService],
})
export class RestaurantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleWare)
      .exclude()
      // .exclude(
      //   { path: 'restaurants', method: RequestMethod.GET },
      //   { path: 'restaurants/:id', method: RequestMethod.GET },)
      .forRoutes(RestaurantController);
  }
}
