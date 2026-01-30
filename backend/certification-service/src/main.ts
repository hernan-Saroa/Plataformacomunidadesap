import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);

  // Enable CORS
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  if (process.env.CORS_ORIGIN) {
    const corsOrigin = process.env.CORS_ORIGIN;
    allowedOrigins.push(corsOrigin);
    if (!corsOrigin.includes(':80')) {
      allowedOrigins.push(`${corsOrigin}:80`);
    }
    if (!corsOrigin.includes(':5173')) {
      allowedOrigins.push(`${corsOrigin}:5173`);
    }
  }

  app.enableCors({
    origin: isProd ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-Client-Version',
      'X-Client-Platform',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Servir archivos estáticos desde la carpeta 'uploads'
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
