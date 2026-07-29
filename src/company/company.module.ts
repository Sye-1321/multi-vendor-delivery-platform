import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyMapper } from './company.mapper';
import {
  CompanyDataModel,
  CompanySchema,
} from 'src/infrastructure/data_access/repositories/schemas/company.schema';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import { TYPES } from './../application/constants/types';
import { CompanyRepository } from 'src/infrastructure/data_access/repositories/company.repository';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/infrastructure/email/email-service';
import { AccessControlService } from 'src/shared/services/access_control.service';
import { RoleService } from 'src/shared/services/role_service';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { UserMapper } from 'src/user/user.mapper';
import { AuditMapper } from 'src/audit/audit.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyDataModel.name, schema: CompanySchema },
      { name: UserDataModel.name, schema: UserSchema },
    ]),
  ],
  controllers: [CompanyController],
  providers: [
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAuthService, useClass: AuthService },
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.ICompanyRepository, useClass: CompanyRepository },
    { provide: TYPES.ICompanyService, useClass: CompanyService },
    { provide: TYPES.IUserService, useClass: UserService },
    { provide: TYPES.IAccessControlService, useClass: AccessControlService },
    { provide: TYPES.IRoleService, useClass: RoleService },
    CompanyMapper,
    UserRepository,
    JwtService,
    EmailService,
    UserMapper,
    AuditMapper,
  ],
  exports: [TYPES.ICompanyService],
})
export class CompanyModule {}
