import { Module } from '@nestjs/common';

import { PeriodosController } from './periodos.controller.js';
import { PeriodosService } from './periodos.service.js';

/** Periodo único de plataforma (EFDS-2328): lectura del periodo y su programación. */
@Module({
  controllers: [PeriodosController],
  providers: [PeriodosService],
  exports: [PeriodosService],
})
export class PeriodosModule {}
