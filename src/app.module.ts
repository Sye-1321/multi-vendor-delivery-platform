import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { CompanyModule } from './company/company.module';
import { DeliveryPersonModule } from './delivery-person/delivery-person.module';
import { ApplicationExceptionsFilter } from './infrastructure/filters/exception.filter';
import { SystemReviewModule } from './system-review/system-review.module';
import { RestaurantReviewModule } from './restaurant-review/restaurant-review.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './order/order.module';
import configuration from './bootstrap/config/configuration';
import { environmentValidationSchema } from './bootstrap/config/environment-validation';
import { HealthModule } from './health/health.module';
import { RequestContextModule } from './infrastructure/context/request-context.module';
import { RequestContextMiddleware } from './infrastructure/middlewares/request-context.middleware';
import { RequestLoggingMiddleware } from './infrastructure/middlewares/request-logging.middleware';
import { ObservabilityModule } from './infrastructure/logger/observability.module';

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
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
        serverSelectionTimeoutMS: 5_000,
      }),
      inject: [ConfigService],
    }),
    RequestContextModule,
    ObservabilityModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware, RequestLoggingMiddleware)
      .forRoutes('{*path}');
  }
}
