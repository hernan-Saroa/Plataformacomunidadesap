import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// Forzar el secreto correcto independientemente de las variables de entorno inyectadas ANTES de importar módulos
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-super-secret-jwt-key-here' ? process.env.JWT_SECRET : 'esap-super-secret-jwt-key-2024';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS para desarrollo (permisivo)
  app.enableCors({
    origin: true, // Permite todos los orígenes en desarrollo
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
      'x-client-version',
      'x-client-platform',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // NOTA: No usar prefijo global ni versionamiento aquí.
  // El API Gateway maneja la estructura /{service}/api/v{version}/{path}
  // y reenvía solo el {path} al microservicio.
  // Ejemplo: /auth/api/v1/users -> auth-service:3001/users

  const port = process.env.PORT || 3001;
  // Forzar reinicio para cargar variables de entorno actualizadas.
  await app.listen(port, '0.0.0.0');
  console.log(`Auth service corriendo en puerto ${port} con CORS habilitado`);
}
bootstrap();
// reload
