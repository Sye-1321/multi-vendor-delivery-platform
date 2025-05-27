import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TYPES } from './../application/constants/types';
import { AuditMapper } from './../audit/audit.mapper';
import { ContextService } from './../infrastructure/context/context.service';
import { SystemReviewDataModel, SystemReviewSchema } from 'src/infrastructure/data_access/repositories/schemas/system-review.schema';
import { ContextMiddleWare } from './../infrastructure/middlewares/context.middleware';
import { SystemReviewRepository } from 'src/infrastructure/data_access/repositories/system-review.repository';
import { UserDataModel, UserSchema } from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { SystemReviewController } from './system-review.controller';
import { UserService } from 'src/user/user.service';
import { SystemReviewService } from './system-review.service';
import { SystemReviewMapper } from './system-review.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/infrastructure/email/email-service';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { AuthService } from 'src/infrastructure/auth/auth.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemReviewDataModel.name, schema: SystemReviewSchema },
      { name: UserDataModel.name, schema: UserSchema},
    ]),
  ],
  controllers: [SystemReviewController],
  providers: [
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IContextService, useClass: ContextService },
    { provide: TYPES.IUserService, useClass: UserService },
   { provide: TYPES.IEmailService, useClass: EmailService},
    { provide: TYPES.ISystemReviewService, useClass: SystemReviewService},
    { provide: TYPES.ISystemReviewRepository, useClass: SystemReviewRepository },
    AuditMapper,
    UserMapper,
    JwtService,
    UserRepository,
    SystemReviewMapper
  ]
})

export class SystemReviewModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleWare).exclude(
      { path: 'reviews', method: RequestMethod.GET },
    ).forRoutes(SystemReviewController);
  }
}
