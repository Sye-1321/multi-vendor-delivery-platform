import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { RestaurantModule } from './restuarant/restaurant.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { CompanyModule } from './company/company.module';
import { DeliveryPersonModule } from './delivery-person/delivery-person.module';
import { ApplicationExceptionsFilter } from './infrastructure/filters/exception.filter';
import { TYPES } from './application/constants/types';
import { ApplicationLogger } from './infrastructure/logger/logger';
import { ContextService } from './infrastructure/context/context.service';
import { ContextMiddleWare } from './infrastructure/middlewares/context.middleware';
import { SystemReviewModule } from './system-review/system-review.module';
import { RestaurantReviewModule } from './restuarant-review/restaurant-review.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './order/order.module';
import { LoggerService } from './infrastructure/filters/logger.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
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
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionsFilter,
    },
    LoggerService,
    { provide: TYPES.IApplicationLogger, useClass: ApplicationLogger },
    { provide: TYPES.IContextService, useClass: ContextService },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleWare).exclude().forRoutes(AppController);
  }
}
