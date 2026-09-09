import { Controller, Get } from '@nestjs/common';

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

  /** GET /validacion/historico — cruces del Excel 2026-1 / 2026-V1. */
  @Get('historico')
  async historico() {
    return {
      success: true,
      data: {
        origen: 'historico',
        periodos: ['2026-1', '2026-V1'],
        resumen: await this.validacion.resumen(),
        cruces: await this.validacion.crucesHistoricos(),
      },
    };
  }
}
