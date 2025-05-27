import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validatePipeInstance } from './infrastructure/utilities/validation-pipe-instance';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('mini-project');
  app.useGlobalPipes(validatePipeInstance);
  app.enableCors();
  await app.listen(4000);
}
bootstrap();
