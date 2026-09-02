import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ensureUploadRootDir } from './common/storage.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // El upload (multer) y la servida estática comparten la misma raíz
  // configurable por entorno (ver common/storage.util.ts). Así el storage puede
  // apuntar a un disco/volumen dedicado en despliegue (TRAVEL_EXPENSES_STORAGE_PATH)
  // y no quedar atado a los archivos del proyecto.
  const uploadsDir = ensureUploadRootDir();
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
