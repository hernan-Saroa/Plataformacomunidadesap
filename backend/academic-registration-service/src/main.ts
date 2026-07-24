import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';

// Zona horaria del proceso. La base de datos (sesión America/Bogota) guarda las
// fechas en columnas "timestamp sin zona" usando la hora local de Bogotá. Si el
// proceso Node corre en otra zona (p. ej. UTC en Docker/servidor), el driver de
// Postgres interpreta esas fechas como UTC y las corre +5 horas, provocando que
// el "TIEMPO" de las solicitudes muestre "hace 5 horas" para algo recién creado.
// Fijar la zona a la de la BD hace que la lectura sea consistente en cualquier
// entorno. Configurable con APP_TZ por si operaciones necesita otra zona.
process.env.TZ = process.env.APP_TZ || 'America/Bogota';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? '35mb';

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

  await app.listen(process.env.PORT ?? 3002);
  console.log(
    `🎓 Academic Registration Service running on port ${process.env.PORT ?? 3002}`,
  );
}
bootstrap();
