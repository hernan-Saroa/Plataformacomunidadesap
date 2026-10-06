import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { rundStaticAccess } from './modules/banco-docentes/rund-static-access';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  app.set('trust proxy', true);
  app.enableShutdownHooks();

  // Cargas masivas de docentes y soportes: mismos límites que tenía el RUND embebido en PTA.
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Soportes documentales: multer escribe en ./uploads (relativo al CWD del servicio).
  // rundStaticAccess restringe los originales RUND según el rol antes de servirlos.
  const uploadsDir = join(process.cwd(), 'uploads');
  app.use(rundStaticAccess(app.get(DataSource), app.get(JwtService)));
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const config = new DocumentBuilder()
    .setTitle('Registro Único Nacional Docente (RUND) API')
    .setDescription('Servicio oficial para la gestión del Registro Único Nacional Docente, méritos, trayectoria y tarjeta digital de la ESAP.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3016;
  await app.listen(port);
  console.log(`✅ RUND Service running on port ${port}`);
  console.log(`📁 Static uploads served from ${uploadsDir} -> /uploads/`);
  console.log(`📄 Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
