import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { Public } from '../auth/public.decorator';
import { PtaAuthGuard } from './auth/pta-auth.guard';
import { InteroperabilidadService, PtaInteroperabilidadGuard } from './interoperabilidad.service';

/**
 * Interruptor de la interoperabilidad PTA ↔ Programación Académica (EFDS-2435).
 * Solo roles con el permiso `pta.backoffice.interoperabilidad` (o superusuario): el servidor lo
 * rechaza para los demás, no basta con ocultar la pantalla.
 */
@Public() // el PtaAuthGuard verifica el token por su cuenta, como el resto del PTA
@Controller(['configuracion/interoperabilidad', 'pta/configuracion/interoperabilidad'])
@UseGuards(PtaAuthGuard, PtaInteroperabilidadGuard)
export class InteroperabilidadController {
  constructor(private readonly servicio: InteroperabilidadService) {}

  /** Estado vigente, origen, último cambio e impacto (lo que se muestra antes de confirmar). */
  @Get()
  async estado() {
    return { success: true, data: await this.servicio.estado() };
  }

  /** { habilitada, desdePeriodo?, motivo (≥10), confirmacion: true } */
  @Put()
  async cambiar(@Body() body: any, @Req() req: Request) {
    const a = req.ptaAuth!;
    return { success: true, data: await this.servicio.cambiar(body, { userId: a.userId, email: a.email, roles: a.roles, name: a.name }) };
  }
}
