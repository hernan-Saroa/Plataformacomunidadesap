import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploadsDir = join(__dirname, '..', 'uploads');
  try {
    mkdirSync(uploadsDir, { recursive: true });
  } catch {}
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  console.log(`✅ Travel Expenses Service running on port ${port}`);
}
bootstrap();
