import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { CompanyModule } from './company/company.module';
import { DeliveryPersonModule } from './delivery-person/delivery-person.module';
import { ApplicationExceptionsFilter } from './infrastructure/filters/exception.filter';
import { TYPES } from './application/constants/types';
import { ApplicationLogger } from './infrastructure/logger/logger';
import { ContextService } from './infrastructure/context/context.service';
import { SystemReviewModule } from './system-review/system-review.module';
import { RestaurantReviewModule } from './restaurant-review/restaurant-review.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './order/order.module';
import { LoggerService } from './infrastructure/filters/logger.service';
import configuration from './bootstrap/config/configuration';
import { environmentValidationSchema } from './bootstrap/config/environment-validation';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [configuration],
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
        serverSelectionTimeoutMS: 5_000,
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    AuthModule,
    UserModule,
    CompanyModule, 
    RestaurantModule,
    DeliveryPersonModule,
    SystemReviewModule,
    RestaurantReviewModule,
    MenuItemModule,
    MenuModule,
    OrderModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionsFilter,
    },
    LoggerService,
    { provide: TYPES.IApplicationLogger, useClass: ApplicationLogger },
    { provide: TYPES.IContextService, useClass: ContextService },
  ],
})
export class AppModule {}
