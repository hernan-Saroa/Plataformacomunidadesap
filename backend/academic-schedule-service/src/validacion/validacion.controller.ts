import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { ValidacionService } from './validacion.service.js';

/**
 * Validación de cruces (3.9).
 *
 * Dos contadores con fuentes distintas, que no se mezclan:
 *   · HISTÓRICO — hallazgos del Excel de programación, revisados a mano;
 *   · VIVOS — cruces reales de la programación del sistema (EFDS-2307). Deben
 *     dar 0 porque se rechazan al guardar; contarlos es el canario de esa regla.
 */
@Controller('validacion')
export class ValidacionController {
  constructor(
    private readonly validacion: ValidacionService,
    private readonly niveles: NivelesRequestService,
  ) {}

  /**
   * GET /validacion/vivos?periodo=<id> — cruces REALES de la programación viva
   * (EFDS-2307). Debe dar 0 porque la API los rechaza al guardar; si no da 0, el
   * panel avisa. Exige poder programar algún nivel; no revela asignaturas.
   */
  @Get('vivos')
  async vivos(@Req() req: Request, @Query('periodo') idPeriodo?: string) {
    await this.niveles.de(req);
    return { success: true, data: await this.validacion.crucesVivos(idPeriodo || undefined) };
  }

  /**
   * GET /validacion/historico?periodo=<codigo> — cruces del histórico.
   *
   * Con `periodo` acota a ese periodo (un periodo nuevo → 0; solo 2026-1 /
   * 2026-V1 traen los suyos). Sin él, todo el histórico (compatibilidad).
   */
  @Get('historico')
  async historico(@Query('periodo') periodo?: string) {
    return {
      success: true,
      data: {
        origen: 'historico',
        periodos: periodo ? [periodo] : ['2026-1', '2026-V1'],
        resumen: await this.validacion.resumen(periodo),
        cruces: await this.validacion.crucesHistoricos(periodo),
      },
    };
  }
}
