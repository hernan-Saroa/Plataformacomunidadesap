import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('InfrastructureManagementServiceBootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Asegurar directorio uploads automáticamente para desarrollo y despliegues
  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Prefix 1: acceso directo al microservicio (local/swagger/desa)
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });
  // Prefix 2: acceso por Shell Gateway /services/infraestructura/uploads/...
  // (misma carpeta, ruta routeada por NGINX location /services/ -> api-gateway)
  // Mantiene mismo origin => img-src 'self' valido (sin CSP blocked ni Mixed Content)
  app.useStaticAssets(uploadsDir, {
    prefix: '/services/infraestructura/uploads/',
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ESAP Infrastructure Management Service API')
    .setDescription('Microservicio de Gestión de Infraestructura, Sedes, Espacios y Mantenimiento de la ESAP')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3014;
  await app.listen(port);
  logger.log(`🚀 Infrastructure Management Service ejecutándose en http://localhost:${port}`);
  logger.log(`📚 Documentación Swagger en http://localhost:${port}/api/docs`);
}
bootstrap();
