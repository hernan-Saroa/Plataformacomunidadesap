import { Module } from '@nestjs/common';

import { AulasController } from './aulas.controller.js';
import { AulasService } from './aulas.service.js';

/**
 * Aulas: catálogo (provisional, C-4), disponibilidad confidencial (RN-07) y
 * publicación de la oferta con aula obligatoria (EFDS-1374).
 */
@Module({
  controllers: [AulasController],
  providers: [AulasService],
  exports: [AulasService],
})
export class AulasModule {}
