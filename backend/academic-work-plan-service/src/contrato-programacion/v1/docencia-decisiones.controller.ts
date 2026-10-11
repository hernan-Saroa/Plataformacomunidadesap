import { Body, Controller, Post, Req } from '@nestjs/common';

import { DocenciaDecisionesService, type DecisionDocenciaDto } from './docencia-decisiones.service';

/**
 * Contrato PROG↔PTA v1 — docencia concertada (EFDS-2315).
 *
 * Controlador APARTE del de docentes: aquel es de solo lectura sobre el RUND
 * (RN-09) y su prueba estructural sigue intacta. Este escribe únicamente en la
 * tabla propia del PTA `docencia_concertada`, nunca en el RUND.
 */
@Controller('contrato-programacion/v1/docencia')
export class DocenciaDecisionesController {
  constructor(private readonly decisiones: DocenciaDecisionesService) {}

  /** POST /contrato-programacion/v1/docencia/decisiones — registra una concertación aprobada. */
  @Post('decisiones')
  async registrar(@Req() req: any, @Body() body: DecisionDocenciaDto) {
    return { success: true, data: await this.decisiones.registrar(req?.user?.userId, body) };
  }
}
