import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AlertasVencimientoTerminosService } from './services/alertas-vencimiento-terminos.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  const svc = app.get(AlertasVencimientoTerminosService);
  const resultado = await svc.ejecutarVerificacionManual();
  console.log('RESULTADO_PRUEBA_MANUAL:', JSON.stringify(resultado));
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('ERROR_PRUEBA_MANUAL:', err);
  process.exit(1);
});
