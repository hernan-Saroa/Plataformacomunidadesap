import { Module } from '@nestjs/common';

import { AcumuladoService } from './acumulado.service.js';
import { AsignacionesController } from './asignaciones.controller.js';
import { AsignacionesService } from './asignaciones.service.js';
import { ContratoClient } from './contrato-client.js';

/**
 * Asignación de docente a grupo, con bloqueo duro (EFDS-1372) y descuento de
 * horas contra el tope (EFDS-1373).
 *
 * La situación administrativa se resuelve sobre el campo estructurado del RUND
 * (dato). El cálculo de horas se consume por el contrato PROG↔PTA (lógica), no se
 * copia: ContratoClient.
 */
@Module({
  controllers: [AsignacionesController],
  providers: [AsignacionesService, AcumuladoService, ContratoClient],
  exports: [AsignacionesService, AcumuladoService],
})
export class AsignacionesModule {}
