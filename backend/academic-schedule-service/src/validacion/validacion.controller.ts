import { Controller, Get, Query } from '@nestjs/common';

import { ValidacionService } from './validacion.service.js';

/**
 * Validación de cruces (3.9).
 *
 * Solo expone el HISTÓRICO. Los cruces de la programación viva no se listan
 * aquí porque el sistema no permite crearlos: se rechazan al guardar.
 */
@Controller('validacion')
export class ValidacionController {
  constructor(private readonly validacion: ValidacionService) {}

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
