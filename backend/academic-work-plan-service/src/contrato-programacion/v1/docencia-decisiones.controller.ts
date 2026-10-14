import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';

import { Public } from '../../auth/public.decorator';

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

  /**
   * GET /contrato-programacion/v1/docencia/configuracion — el interruptor de este
   * lado (EFDS-2315). Público: solo dice si está encendido. Lo consulta
   * Programación Académica para el interruptor único de los dos servicios.
   */
  @Public()
  @Get('configuracion')
  configuracion() {
    return { success: true, data: this.decisiones.configuracion() };
  }

  /**
   * GET /contrato-programacion/v1/docencia/regimen?ptaId=|periodo= — para la
   * pantalla del PTA: 'programacion' (Docencia de solo lectura, viene de la
   * concertación) o 'actual' (la de hoy). Misma regla que aplica el servidor.
   */
  @Get('regimen')
  async regimen(@Query('periodo') periodo?: string, @Query('ptaId') ptaId?: string) {
    return { success: true, data: await this.decisiones.regimen(periodo, ptaId) };
  }

  /** POST /contrato-programacion/v1/docencia/decisiones — registra una concertación aprobada. */
  @Post('decisiones')
  async registrar(@Req() req: any, @Body() body: DecisionDocenciaDto) {
    return { success: true, data: await this.decisiones.registrar(req?.user?.userId, body) };
  }
}
