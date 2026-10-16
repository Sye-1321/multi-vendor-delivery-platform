import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ExceptionResponseSchema,
  HealthResponseSchema,
} from 'src/infrastructure/swagger/swagger.schemas';

interface HealthResponse {
  status: 'ok';
  service: string;
  database?: 'connected';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Pick<Connection, 'readyState'>,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Check process liveness' })
  @ApiOkResponse({ type: HealthResponseSchema })
  liveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'multi-vendor-delivery-platform',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check service and database readiness' })
  @ApiOkResponse({ type: HealthResponseSchema })
  @ApiServiceUnavailableResponse({ type: ExceptionResponseSchema })
  readiness(): HealthResponse {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException('Database is not ready');
    }

    return {
      status: 'ok',
      service: 'multi-vendor-delivery-platform',
      database: 'connected',
    };
  }
}
