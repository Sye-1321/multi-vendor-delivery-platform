import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { validatePipeInstance } from './infrastructure/utilities/validation-pipe-instance';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  if (config.getOrThrow<string>('app.nodeEnv') === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Multi-Vendor Delivery Platform')
      .setDescription(
        'REST API for multi-vendor restaurant ordering, fulfilment, and delivery.',
      )
      .setVersion(apiVersion)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT (refresh token only)',
          description: 'Refresh JWT accepted only by POST /auth/refresh.',
        },
        'refresh-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
    });
  }

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
