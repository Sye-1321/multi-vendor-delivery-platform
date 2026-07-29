import { ServiceUnavailableException } from '@nestjs/common';
import { ConnectionStates } from 'mongoose';
import { HealthController } from './health.controller';

const createController = (readyState: ConnectionStates): HealthController =>
  new HealthController({ readyState });

describe('HealthController', () => {
  it('reports that the process is alive without requiring the database', () => {
    const controller = createController(ConnectionStates.disconnected);

    expect(controller.liveness()).toEqual({
      status: 'ok',
      service: 'multi-vendor-delivery-platform',
    });
  });

  it('reports readiness when MongoDB is connected', () => {
    const controller = createController(ConnectionStates.connected);

    expect(controller.readiness()).toEqual({
      status: 'ok',
      service: 'multi-vendor-delivery-platform',
      database: 'connected',
    });
  });

  it('rejects readiness while MongoDB is unavailable', () => {
    const controller = createController(ConnectionStates.connecting);

    expect(() => controller.readiness()).toThrow(ServiceUnavailableException);
  });
});
