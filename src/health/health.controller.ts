import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

interface HealthResponse {
  status: 'ok';
  service: string;
  database?: 'connected';
}

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Pick<Connection, 'readyState'>,
  ) {}

  @Get('live')
  liveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'multi-vendor-delivery-platform',
    };
  }

  @Get('ready')
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
