import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors({
    origin: true, // Permite todos los orígenes en desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3011;
  await app.listen(port, '0.0.0.0');
  console.log(`Audit service corriendo en puerto ${port}`);
}
bootstrap();


// reload
