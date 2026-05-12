import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? '8mb';

  app.use(json({ limit: requestBodyLimit }));
  app.use(urlencoded({ limit: requestBodyLimit, extended: true }));

  app.set('trust proxy', true);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Servir archivos estáticos desde la carpeta 'uploads' (certificados PDF, logos, firmas)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3002, '0.0.0.0');
  console.log(
    `🎓 Academic Registration Service running on port ${process.env.PORT ?? 3002}`,
  );
}
bootstrap();
// reload
