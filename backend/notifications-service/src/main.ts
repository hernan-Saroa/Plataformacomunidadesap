import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  
  const port = process.env.PORT || 3009;
  await app.listen(port);
  console.log(`Notifications service corriendo en puerto ${port} con CORS habilitado`);
}
bootstrap();
