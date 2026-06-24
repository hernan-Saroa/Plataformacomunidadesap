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

  // Static assets: alineado con multer (que escribe a ./uploads/... relativo al CWD,
  // típicamente la raíz del service). __dirname apunta a /dist (prod) o /src (dev),
  // por eso un único '..' nos coloca en la raíz del service, donde efectivamente
  // existe la carpeta `uploads/`. Antes había DOS '..' que apuntaban a backend/uploads
  // (un nivel arriba) y por eso fallaba con 404.
  const uploadsDir = join(__dirname, '..', 'uploads');
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });
  console.log(`📁 Static uploads served from ${uploadsDir} -> /uploads/`);

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`📘 Academic Work Plan Service running on port ${port}`);
}
bootstrap();
