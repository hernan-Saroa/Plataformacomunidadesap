import { Module } from '@nestjs/common';

import { VistaController } from './vista.controller.js';
import { VistaService } from './vista.service.js';

/**
 * Vistas de la programación (EFDS-2344, EFDS-2343): árbol por programa y
 * calendario del docente. Solo lectura; el portal reusa el calendario.
 */
@Module({
  controllers: [VistaController],
  providers: [VistaService],
  exports: [VistaService],
})
export class VistaModule {}
