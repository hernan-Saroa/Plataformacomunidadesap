import { Module } from '@nestjs/common';

import { AulasController } from './aulas.controller.js';
import { AulasService } from './aulas.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';

/**
 * Aulas: catálogo (provisional, C-4), disponibilidad confidencial (RN-07),
 * publicación de la oferta con aula obligatoria (EFDS-1374) y CRUD del dato
 * maestro (EFDS-1942, gated en `programacion-academica.all`).
 */
@Module({
  controllers: [AulasController],
  providers: [AulasService, ProgramacionPermissionsService],
  exports: [AulasService],
})
export class AulasModule {}
