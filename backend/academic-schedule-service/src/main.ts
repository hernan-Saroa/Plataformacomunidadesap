import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT || 3013;
  await app.listen(port);
  console.log(`[academic-schedule-service] Microservicio corriendo en puerto ${port}`);
}
bootstrap();
