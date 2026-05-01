import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');

  app.set('trust proxy', true);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3113'],
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`📘 Academic Work Plan Service running on port ${port}`);
}
bootstrap();
