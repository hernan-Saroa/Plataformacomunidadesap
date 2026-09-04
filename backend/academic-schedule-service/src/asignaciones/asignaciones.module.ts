import { Module } from '@nestjs/common';

import { AsignacionesController } from './asignaciones.controller.js';
import { AsignacionesService } from './asignaciones.service.js';

/**
 * Asignación de docente a grupo, con bloqueo duro (EFDS-1372).
 *
 * El endpoint y el panel de solo lectura entran con la subtarea 8. La situación
 * administrativa se resuelve en el servidor sobre el campo estructurado del RUND.
 */
@Module({
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
  exports: [AsignacionesService],
})
export class AsignacionesModule {}
