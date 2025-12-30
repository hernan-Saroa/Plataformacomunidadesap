import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000', // Permitir solo frontend local
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Force restart 2025-12-30
  await app.listen(process.env.PORT ?? 3008);
}
bootstrap();
