import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/response.interceptor';
import { AppModule } from './app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Interceptor de respuesta global
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Internal Disciplinary Control Service')
    .setDescription(
      'Microservicio para la gestión del ciclo de vida de los procesos disciplinarios de la ESAP',
    )
    .setVersion('1.0.0')
    .addTag('Noticias Disciplinarias', 'Gestión de noticias y quejas')
    .addTag('Procesos Disciplinarios', 'Gestión de procesos asignados')
    .addTag('Autos Legales', 'Gestión de documentos y autos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Habilitar CORS con configuración específica
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3005;

  // Ejecutar seed
  try {
    const seedService = app.get(SeedService);
    await seedService.seed();
  } catch (error) {
    console.error('Error running seed:', error);
  }

  await app.listen(port);
  console.log(`🚀 Internal Disciplinary Control Service running on http://localhost:${port}`);
}
bootstrap();
