import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TYPES } from './../application/constants/types';
import { AuditMapper } from './../audit/audit.mapper';
import {
  RestaurantReviewDataModel,
  RestaurantReviewSchema,
} from 'src/infrastructure/data_access/repositories/schemas/restaurant-review.schema';
import { RestaurantReviewRepository } from 'src/infrastructure/data_access/repositories/restaurant-review.repository';
import { AuditModule } from 'src/audit/audit.module';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { UserModule } from 'src/user/user.module';
import { UserMapper } from 'src/user/user.mapper';
import { RestaurantReviewMapper } from './restaurant-review.mapper';
import { RestaurantReviewService } from './restaurant-review.service';
import { RestaurantReviewController } from './restaurant-review.controller';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { EmailService } from 'src/infrastructure/email/email-service';
import { RestaurantModule } from 'src/restaurant/restaurant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantReviewDataModel.name, schema: RestaurantReviewSchema },
      { name: UserDataModel.name, schema: UserSchema },
    ]),
    forwardRef(() => UserModule),
    AuditModule,
    RestaurantModule,
  ],

  providers: [
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IUserService, useClass: UserService },
    {
      provide: TYPES.IRestaurantReviewService,
      useClass: RestaurantReviewService,
    },
    {
      provide: TYPES.IRestaurantReviewRepository,
      useClass: RestaurantReviewRepository,
    },
    AuditMapper,
    UserMapper,
    JwtService,
    UserRepository,
    RestaurantReviewMapper,
  ],
  controllers: [RestaurantReviewController],
})
export class RestaurantReviewModule {}
