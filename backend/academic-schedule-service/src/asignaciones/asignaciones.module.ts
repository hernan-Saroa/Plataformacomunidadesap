import { Module } from '@nestjs/common';

import { AsignacionesService } from './asignaciones.service.js';

/**
 * Asignación de docente a grupo, con bloqueo duro (EFDS-1372).
 *
 * Aún sin controlador: la UI y el endpoint entran con la subtarea 8. El servicio
 * se expone para que el resto del módulo pueda consumirlo.
 */
@Module({
  providers: [AsignacionesService],
  exports: [AsignacionesService],
})
export class AsignacionesModule {}
