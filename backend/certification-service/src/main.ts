import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';

// Las columnas de fecha de certificados (request_date, issuance_timestamp,
// created_at, updated_at) son `timestamp WITHOUT time zone` y la BD, con sesión
// America/Bogota, las guarda con el wall-clock de Bogotá. Si el proceso Node
// corre en UTC (Docker/servidor), node-postgres las interpreta como UTC y las
// corre +5 horas: la hora de solicitud sale desfasada y, cuando el registro es
// de madrugada, la fecha se va al día anterior. Fijar la zona a la de la BD
// hace que la lectura sea consistente en cualquier entorno.
// Configurable con APP_TZ por si operaciones necesita otra zona.
process.env.TZ = process.env.APP_TZ || 'America/Bogota';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const bodyLimit = process.env.HTTP_BODY_LIMIT || '50mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
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
      'x-client-platform',
      'X-Client-Platform'],
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
