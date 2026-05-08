import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  console.log(`✅ Interoperability Service running on port ${port}`);
}
bootstrap();
