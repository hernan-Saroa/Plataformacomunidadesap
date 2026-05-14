import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');

  // Configurar CORS para desarrollo (permisivo)
  app.enableCors({
    origin: true, // Permite todos los orígenes en desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Accept-Charset',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-Client-Version',
      'X-Client-Platform',
      'X-Access-Token',
      'x-client-platform',
      'x-client-version',
      // User-context headers sent by the Shell frontend
      'X-User-Id',
      'X-User-Email',
      'X-User-Name',
      'X-User-Roles',
      'x-user-id',
      'x-user-username',
      'x-user-roles',
      'x-user-email',
      'x-user-name',
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
  await app.listen(port);
  console.log(`Auth service corriendo en puerto ${port} con CORS habilitado`);
}
bootstrap();
