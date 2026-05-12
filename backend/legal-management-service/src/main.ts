import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');

  // Aumentar límite de payload para uploads de documentos (250MB)
  app.use(bodyParser.json({ limit: '250mb' }));
  app.use(bodyParser.urlencoded({ limit: '250mb', extended: true }));

  app.enableCors({
    origin: true, // Permitir cualquier origen (o configurar según var de entorno)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Force restart 2025-12-30
  await app.listen(process.env.PORT ?? 3008, '0.0.0.0');
}
bootstrap();
// reload
