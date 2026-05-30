import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  const requestTimeoutMs = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 6 * 60 * 60 * 1000);

  // Increase body size limit for file uploads (up to 250MB)
  app.use(json({ limit: '250mb' }));
  app.use(urlencoded({ extended: true, limit: '250mb' }));

  // app.set('trust proxy', true);

  // Configurar CORS dinámicamente por ambiente
  const allowedOrigins = [
    // Desarrollo local (siempre permitidos)
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
  ];

  // Agregar origen desde variable de entorno (DEV, QA, PROD)
  // CORS_ORIGIN se configura en docker-compose.{env}.yml
  if (process.env.CORS_ORIGIN) {
    const corsOrigin = process.env.CORS_ORIGIN;
    allowedOrigins.push(corsOrigin);
    // También agregar con puerto 80 explícito
    if (!corsOrigin.includes(':80')) {
      allowedOrigins.push(`${corsOrigin}:80`);
    }
    // También agregar con puerto 5173 explícito
    if (!corsOrigin.includes(':5273')) {
      allowedOrigins.push(`${corsOrigin}:5273`);
    }
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'x-client-platform', 'x-client-version', 'X-Access-Token', 'X-Auth-Token', 'X-User-ID', 'X-User-Roles', 'X-User-Email', 'X-User-Name'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // El versionamiento ahora es por microservicio:
  // /{service}/api/v{version}/{path}
  // Ejemplo: /auth/api/v1/users, /certificados/api/v2/generate
  // Esto permite que cada microservicio tenga su propia versión independiente
  // El gateway controller maneja el ruteo basado en el primer segmento de la URL

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
  const server = app.getHttpServer();
  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = requestTimeoutMs + 1000;
  server.keepAliveTimeout = 65000;
}
bootstrap();
