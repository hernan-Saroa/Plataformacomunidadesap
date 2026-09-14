import { Controller, Get, Param } from '@nestjs/common';

import { OfertasService } from './ofertas.service.js';

/**
 * Ofertas académicas y consumo por oferta — EFDS-1375.
 */
@Controller('ofertas')
export class OfertasController {
  constructor(private readonly ofertas: OfertasService) {}

  /** GET /ofertas — las cinco ofertas académicas (periodo + tipo). */
  @Get()
  async listar() {
    return { success: true, data: await this.ofertas.listar() };
  }

  /** GET /ofertas/consumo/:documento — consumo del docente por oferta vs tope. */
  @Get('consumo/:documento')
  async consumo(@Param('documento') documento: string) {
    return { success: true, data: await this.ofertas.consumoPorOferta(documento) };
  }
}
