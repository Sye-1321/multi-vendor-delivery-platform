import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { TYPES } from './../application/constants/types';
import { AuthService } from './../infrastructure/auth/auth.service';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { RestaurantRepository } from 'src/infrastructure/data_access/repositories/restaurant.repository';
import { OrderRepository } from 'src/infrastructure/data_access/repositories/order.repository';
import { AuditMapper } from './../audit/audit.mapper';
import {
  OrderDataModel,
  OrderSchema,
} from 'src/infrastructure/data_access/repositories/schemas/order.schema';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant.schema';
import { OrderService } from './order.service';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { OrderController } from './order.controller';
import { UserService } from 'src/user/user.service';
import { UserMapper } from 'src/user/user.mapper';
import { EmailService } from 'src/infrastructure/email/email-service';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import { OrderMapper } from './order.mapper';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { CompanyService } from 'src/company/company.service';
import { CartItemMapper } from 'src/cart-item/cartItem.mapper';
import { CartItemRepository } from 'src/infrastructure/data_access/repositories/cart-item.repository';
import { CartMapper } from 'src/cart/cart.mapper';
import { CartRepository } from 'src/infrastructure/data_access/repositories/cart.repository';
import { CompanyMapper } from 'src/company/company.mapper';
import { CompanyRepository } from 'src/infrastructure/data_access/repositories/company.repository';
import {
  MenuItemDataModel,
  MenuItemSchema,
} from 'src/infrastructure/data_access/repositories/schemas/menu-item.schema';
import {
  CompanyDataModel,
  CompanySchema,
} from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import { DeliveryPersonRepository } from 'src/infrastructure/data_access/repositories/deliveryperson.repository';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';
import {
  DeliveryPersonDataModel,
  DeliveryPersonSchema,
} from 'src/infrastructure/data_access/repositories/schemas/delivery-person.schema';
import {
  CartItemDataModel,
  CartItemSchema,
} from 'src/infrastructure/data_access/repositories/schemas/cart-item.schema';
import {
  CartDataModel,
  CartSchema,
} from 'src/infrastructure/data_access/repositories/schemas/cart.schema';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { MenuMapper } from 'src/menu/menu.mapper';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { MenuItemRepository } from 'src/infrastructure/data_access/repositories/menu-item.repository';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDataModel.name, schema: UserSchema },
      { name: OrderDataModel.name, schema: OrderSchema },
      { name: RestaurantDataModel.name, schema: RestaurantSchema },
      { name: MenuItemDataModel.name, schema: MenuItemSchema },
      { name: CompanyDataModel.name, schema: CompanySchema },
      { name: DeliveryPersonDataModel.name, schema: DeliveryPersonSchema },
      { name: CartItemDataModel.name, schema: CartItemSchema },
      { name: CartDataModel.name, schema: CartSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IUserRepository, useClass: UserRepository },
    { provide: TYPES.IRestaurantRepository, useClass: RestaurantRepository },
    { provide: TYPES.IRestaurantService, useClass: RestaurantService },
    { provide: TYPES.IOrderRepository, useClass: OrderRepository },
    { provide: TYPES.IOrderService, useClass: OrderService },
    { provide: TYPES.IMenuItemRepository, useClass: MenuItemRepository },
    { provide: TYPES.ICompanyService, useClass: CompanyService },
    { provide: TYPES.ICompanyRepository, useClass: CompanyRepository },
    {
      provide: TYPES.IDeliveryPersonRepository,
      useClass: DeliveryPersonRepository,
    },
    DeliveryPersonMapper,
    CartItemMapper,
    RestaurantReviewMapper,
    MenuItemMapper,
    MenuMapper,
    CartItemRepository,
    CartItemMapper,
    CartMapper,
    CartRepository,
    UserRepository,
    UserMapper,
    CompanyMapper,
    OrderMapper,
    RestaurantMapper,
    JwtService,
    AuditMapper,
    UserMapper,
  ],
})
export class OrderModule {}
