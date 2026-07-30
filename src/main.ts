import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { validatePipeInstance } from './infrastructure/utilities/validation-pipe-instance';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const apiPrefix = config.getOrThrow<string>('app.apiPrefix');
  const apiVersion = config.getOrThrow<string>('app.apiVersion');
  const corsOrigins = config.getOrThrow<string[]>('app.corsOrigins');
  const port = config.getOrThrow<number>('app.port');

  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);
  app.useGlobalPipes(validatePipeInstance);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
