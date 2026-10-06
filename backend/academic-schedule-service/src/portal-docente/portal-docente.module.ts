import { Module } from '@nestjs/common';

import { PortalDocenteController } from './portal-docente.controller.js';
import { PortalDocenteService } from './portal-docente.service.js';
import { AsignacionesModule } from '../asignaciones/asignaciones.module.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';

/**
 * Portal del docente (EFDS-1938): ver, tomar y soltar franjas publicadas, con el
 * acumulado contra el tope. Reusa el AcumuladoService de EFDS-1373 (no toca el
 * calculador del PTA).
 */
@Module({
  imports: [AsignacionesModule],
  controllers: [PortalDocenteController],
  providers: [PortalDocenteService, ProgramacionPermissionsService],
  exports: [PortalDocenteService],
})
export class PortalDocenteModule {}
