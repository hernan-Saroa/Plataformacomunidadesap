import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { AcumuladoService } from './acumulado.service.js';
import { AsignacionesService, type AsignarDocenteDto } from './asignaciones.service.js';

/**
 * Asignación de docente a grupo con bloqueo duro (EFDS-1372) y descuento de horas
 * contra el tope (EFDS-1373).
 *
 * El panel del docente es de SOLO LECTURA (RN-09) y la situación se resuelve en
 * el servidor. El cálculo de horas se pide al contrato PROG↔PTA, reenviando el
 * token de la petición.
 */
@Controller('asignaciones')
export class AsignacionesController {
  constructor(
    private readonly asignaciones: AsignacionesService,
    private readonly acumulado: AcumuladoService,
  ) {}

  /** Token de la petición, para reenviarlo al contrato (que exige autenticación). */
  private tokenDe(req: Request): string | null {
    const auth = String(req.headers['authorization'] || '');
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    const cookie = String(req.headers['cookie'] || '');
    for (const parte of cookie.split(';')) {
      const [k, ...v] = parte.trim().split('=');
      if (k === 'esap_access_token') return v.join('=').trim() || null;
    }
    return null;
  }

  /**
   * GET /asignaciones/docente/:documento?grupo=<id>
   *
   * Panel de solo lectura. Con `grupo`, evalúa en seco el bloqueo (con el impacto
   * de horas calculado por el contrato) y devuelve todos los motivos.
   */
  @Get('docente/:documento')
  async consultarDocente(
    @Req() req: Request,
    @Param('documento') documento: string,
    @Query('grupo') idGrupo?: string,
  ) {
    const data = await this.asignaciones.consultarDocente(documento, idGrupo, this.tokenDe(req));
    return { success: true, data };
  }

  /** GET /asignaciones/acumulado/:documento — consumo transversal por oferta y tope (RN-04/05/06). */
  @Get('acumulado/:documento')
  async acumuladoDocente(@Param('documento') documento: string) {
    return { success: true, data: await this.acumulado.consumo(documento) };
  }

  /**
   * POST /asignaciones — asigna el docente al grupo (bloqueo duro).
   *
   * Devuelve `{ asignado: false, motivos }` con TODOS los motivos si alguna regla
   * falla; en ese caso no se guardó nada. El impacto en horas lo calcula el
   * contrato; el cliente no lo fija.
   */
  @Post()
  async asignar(@Req() req: Request, @Body() body: AsignarDocenteDto) {
    const data = await this.asignaciones.asignar(body, this.tokenDe(req));
    return { success: true, data };
  }

  /** DELETE /asignaciones/grupo/:idGrupo — retira la asignación y libera sus franjas. */
  @Delete('grupo/:idGrupo')
  async retirar(@Param('idGrupo') idGrupo: string) {
    const data = await this.asignaciones.retirar(idGrupo);
    return { success: true, data };
  }
}
