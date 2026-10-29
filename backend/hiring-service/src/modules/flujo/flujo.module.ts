import { Module } from '@nestjs/common';

import { FlujoController, FlujoDelProcesoController } from './flujo.controller';
import { FlujoService } from './flujo.service';

/**
 * El flujo visual (migración 111): versiones del flujo, quién hace y quién
 * aprueba cada actividad por modalidad, validación y activación.
 */
@Module({
  controllers: [FlujoController, FlujoDelProcesoController],
  providers: [FlujoService],
  // Las fichas de Configuración editan el mismo borrador.
  exports: [FlujoService],
})
export class FlujoModule {}
