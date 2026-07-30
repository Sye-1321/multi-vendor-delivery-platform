import { Module } from '@nestjs/common';
import { AuditMapper } from './audit.mapper';

@Module({
  providers: [AuditMapper],
  exports: [AuditMapper],
})
export class AuditModule {}
