import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IsolucionModule } from './modules/isolucion/isolucion.module';
import { IsolucionService } from './modules/isolucion/isolucion.service';

// Diagnóstico independiente: no conecta a PostgreSQL ni arranca el servidor HTTP.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }), IsolucionModule],
})
class DiagnosticModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(DiagnosticModule, { logger: false });
  try {
    const result = await app.get(IsolucionService).diagnostic();
    console.log(JSON.stringify(result, null, 2));
    if (!result.connected) process.exitCode = 1;
  } finally { await app.close(); }
}

main().catch(() => {
  console.error(JSON.stringify({ connected: false, code: 'DIAGNOSTIC_FAILED' }));
  process.exitCode = 1;
});
