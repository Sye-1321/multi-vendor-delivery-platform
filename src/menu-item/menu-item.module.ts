import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TYPES } from './../application/constants/types';
import { MenuItemController } from './menu-item.controller';
import { MenuItemMapper } from './menu-item.mapper';
import {
  MenuItemDataModel,
  MenuItemSchema,
} from 'src/infrastructure/data_access/repositories/schemas/menu-item.schema';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { UserModule } from 'src/user/user.module';
import { RestaurantModule } from 'src/restaurant/restaurant.module';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { EmailService } from 'src/infrastructure/email/email-service';
import { UserService } from 'src/user/user.service';
import { MenuItemService } from './menu-item.service';
import { MenuItemRepository } from 'src/infrastructure/data_access/repositories/menu-item.repository';
import { AuditMapper } from 'src/audit/audit.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';
import { RestaurantRepository } from 'src/infrastructure/data_access/repositories/restaurant.repository';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant.schema';
import {
  CompanyDataModel,
  CompanySchema,
} from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import { CompanyRepository } from 'src/infrastructure/data_access/repositories/company.repository';
import { CompanyService } from 'src/company/company.service';
import { CompanyMapper } from 'src/company/company.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { MenuMapper } from 'src/menu/menu.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantDataModel.name, schema: RestaurantSchema },
      { name: UserDataModel.name, schema: UserSchema },
      { name: CompanyDataModel.name, schema: CompanySchema },
      { name: MenuItemDataModel.name, schema: MenuItemSchema },
      { name: UserDataModel.name, schema: UserSchema },
    ]),
    UserModule,
    RestaurantModule,
  ],
  controllers: [MenuItemController],
  providers: [
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IMenuItemService, useClass: MenuItemService },
    { provide: TYPES.IMenuItemRepository, useClass: MenuItemRepository },
    { provide: TYPES.IRestaurantRepository, useClass: RestaurantRepository },
    { provide: TYPES.IRestaurantService, useClass: RestaurantService },
    { provide: TYPES.ICompanyRepository, useClass: CompanyRepository },
    { provide: TYPES.ICompanyService, useClass: CompanyService },
    AuditMapper,
    UserMapper,
    JwtService,
    UserRepository,
    MenuItemMapper,
    RestaurantMapper,
    CompanyMapper,
    RestaurantReviewMapper,
    MenuMapper,
  ],
  exports: [MenuItemMapper],
})
export class MenuItemModule {}
