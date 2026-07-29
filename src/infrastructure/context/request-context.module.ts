import { Global, Module } from '@nestjs/common';
import { TYPES } from 'src/application/constants/types';
import { ContextService } from './context.service';

@Global()
@Module({
  providers: [
    ContextService,
    {
      provide: TYPES.IContextService,
      useExisting: ContextService,
    },
  ],
  exports: [ContextService, TYPES.IContextService],
})
export class RequestContextModule {}
