import { Module } from '@nestjs/common';

import { OfertasController } from './ofertas.controller.js';
import { OfertasService } from './ofertas.service.js';
import { AsignacionesModule } from '../asignaciones/asignaciones.module.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';

/**
 * Ofertas académicas (EFDS-1375). Reusa el AcumuladoService de asignaciones: la
 * acumulación por oferta ya vive ahí (EFDS-1373), no se reconstruye.
 */
@Module({
  imports: [AsignacionesModule],
  controllers: [OfertasController],
  providers: [OfertasService, ProgramacionPermissionsService],
  exports: [OfertasService],
})
export class OfertasModule {}
