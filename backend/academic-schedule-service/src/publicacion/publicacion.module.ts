import { Module } from '@nestjs/common';

import { PublicacionController } from './publicacion.controller.js';
import { PublicacionService } from './publicacion.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';

/**
 * Publicación de la programación (NUEVA-1 / EFDS-1937): publicar y retirar el
 * conjunto de franjas de un periodo, gated en `programacion-academica.all`.
 */
@Module({
  controllers: [PublicacionController],
  providers: [PublicacionService, ProgramacionPermissionsService],
  exports: [PublicacionService],
})
export class PublicacionModule {}
