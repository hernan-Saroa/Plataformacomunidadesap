import { Controller, Get, Param, Query } from '@nestjs/common';

import { CalculoHorasService } from './calculo-horas.service';

/**
 * Contrato PROG↔PTA v1 — cálculo de horas (EFDS-1373, cierra EFDS-1651).
 *
 * ⚠️ SOLO LECTURA. Es un cálculo derivado del catálogo; no escribe nada. El
 * controlador declara únicamente GET, y esa es la garantía estructural.
 *
 * El cálculo pasa por `HorasPtaCalculator` (la lógica del PTA), no por una copia:
 * así los dos módulos calculan idéntico y el test de paridad lo protege.
 */
@Controller('contrato-programacion/v1/calculo')
export class CalculoHorasController {
  constructor(private readonly calculo: CalculoHorasService) {}

  /**
   * GET /contrato-programacion/v1/calculo/asignatura/:codigo?vinculacion=<tipo>
   *
   * Devuelve las horas de clase, las horas PTA de carrera (×3) y el impacto real
   * según la vinculación (factor RN-03). Sin `vinculacion`, aplica el factor
   * pleno (×3), que es el tratamiento conservador para el tope.
   */
  @Get('asignatura/:codigo')
  async porAsignatura(
    @Param('codigo') codigo: string,
    @Query('vinculacion') vinculacion?: string,
  ) {
    return { success: true, data: await this.calculo.calcular(codigo, vinculacion) };
  }
}
