import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { UserMapper } from 'src/user/user.mapper';
import { UserRepository } from '../data_access/repositories/user.repository';
import {
  UserDataModel,
  UserSchema,
} from '../data_access/repositories/schemas/user.schema';
import { AccessRevocationPublisher } from './access-revocation.publisher';
import { AccountAccessService } from './account-access.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDataModel.name, schema: UserSchema },
    ]),
  ],
  providers: [
    AuditMapper,
    UserMapper,
    UserRepository,
    AccountAccessService,
    AccessRevocationPublisher,
  ],
  exports: [AccountAccessService, AccessRevocationPublisher],
})
export class AccountAccessModule {}
