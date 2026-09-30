import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
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
  console.log(`📄 Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
