import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';
import { UserRepository } from '../infrastructure/data_access/repositories/user.repository';
import { TYPES } from '../application/constants/types';
import { AuditMapper } from '../audit/audit.mapper';
import { AuthService } from '../infrastructure/auth/auth.service';
import {
  UserDataModel,
  UserSchema,
} from '../infrastructure/data_access/repositories/schemas/user.schema';
import { UserMapper } from './user.mapper';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EmailService } from 'src/infrastructure/email/email-service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDataModel.name, schema: UserSchema },
    ]),
    JwtModule.register({
      secret: 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    { provide: TYPES.IUserRepository, useClass: UserRepository },
    UserRepository,
    UserMapper,
    AuditMapper,
  ],
  controllers: [UserController],
})
export class UserModule {}
