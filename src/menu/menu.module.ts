import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TYPES } from './../application/constants/types';
import { ContextMiddleWare } from './../infrastructure/middlewares/context.middleware';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from 'src/infrastructure/data_access/repositories/menu.repository';
import { MenuMapper } from './menu.mapper';
import { MenuItemRepository } from 'src/infrastructure/data_access/repositories/menu-item.repository';
import {
  MenuDataModel,
  MenuSchema,
} from 'src/infrastructure/data_access/repositories/schemas/menu.schema';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { MenuItemModule } from 'src/menu-item/menu-item.module';
import { AuditMapper } from 'src/audit/audit.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { UserService } from 'src/user/user.service';
import { ContextService } from 'src/infrastructure/context/context.service';
import { EmailService } from 'src/infrastructure/email/email-service';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { MenuItemService } from 'src/menu-item/menu-item.service';
import { RestaurantRepository } from 'src/infrastructure/data_access/repositories/restaurant.repository';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import {
  MenuItemDataModel,
  MenuItemSchema,
} from 'src/infrastructure/data_access/repositories/schemas/menu-item.schema';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant.schema';
import { CompanyRepository } from 'src/infrastructure/data_access/repositories/company.repository';
import { CompanyService } from 'src/company/company.service';
import {
  CompanyDataModel,
  CompanySchema,
} from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import { CompanyMapper } from 'src/company/company.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantDataModel.name, schema: RestaurantSchema },
      { name: MenuDataModel.name, schema: MenuSchema },
      { name: UserDataModel.name, schema: UserSchema },
      { name: MenuItemDataModel.name, schema: MenuItemSchema },
      { name: CompanyDataModel.name, schema: CompanySchema },
    ]),
  ],
  controllers: [MenuController],
  providers: [
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IContextService, useClass: ContextService },
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IMenuService, useClass: MenuService },
    { provide: TYPES.IMenuRepository, useClass: MenuRepository },
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
    MenuMapper,
    RestaurantMapper,
    CompanyMapper,
    RestaurantReviewMapper,
  ],
})
export class MenuModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleWare)
      .forRoutes(
        { path: 'me/menus', method: RequestMethod.ALL },
        { path: 'me/menus/:id', method: RequestMethod.ALL },
      );
  }
}
