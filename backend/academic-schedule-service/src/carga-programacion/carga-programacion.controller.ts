import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { EscrituraEn } from '../acceso/escritura.decorator.js';
import { rolesDe } from '../acceso/roles.js';
import { tokenDe } from '../acceso/token.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { CargaProgramacionService, type Actor } from './carga-programacion.service.js';
import type { FilaCarga } from './normalizar.js';
import { ReutilizarPeriodoService, type AlcanceReutilizacion } from './reutilizar-periodo.service.js';

function idUserDe(req: Request): string | null {
  const id = String(req.headers['x-user-id'] || (req as any)?.user?.userId || '').trim();
  return id || null;
}

/**
 * Carga de la programación por plantilla de Excel y reutilización de otro periodo.
 *
 * El Excel lo genera y lo lee la pantalla; aquí llegan las FILAS (JSON) y aquí se valida
 * todo. Así la regla vive en un solo lugar y la carga se puede probar por API.
 */
@Controller()
export class CargaProgramacionController {
  constructor(
    private readonly carga: CargaProgramacionService,
    private readonly reutilizacion: ReutilizarPeriodoService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  private async actor(req: Request): Promise<Actor> {
    return { idUser: idUserDe(req), permisos: await this.permisos.resolveForRoles(rolesDe(req)), token: tokenDe(req) };
  }

  /** GET /carga-programacion/referencia?periodo=<id> — asignaturas y ofertas CETAP para llenar la plantilla. */
  @Get('carga-programacion/referencia')
  async referencia(@Req() req: Request, @Query('periodo') idPeriodo: string) {
    return { success: true, data: await this.carga.referencia(idPeriodo, (await this.actor(req)).permisos) };
  }

  /** POST /carga-programacion/validar { idPeriodo, filas } — recorre la carga completa y la revierte. No escribe. */
  @Post('carga-programacion/validar')
  @EscrituraEn({ periodo: { body: 'idPeriodo' } }, { exigeNivel: true })
  async validar(@Req() req: Request, @Body() body: { idPeriodo: string; filas: FilaCarga[] }) {
    return { success: true, data: await this.carga.procesar(body?.idPeriodo, body?.filas, await this.actor(req), false) };
  }

  /** POST /carga-programacion { idPeriodo, filas } — TODO O NADA: 409 con el reporte si hay un solo error. */
  @Post('carga-programacion')
  @EscrituraEn({ periodo: { body: 'idPeriodo' } }, { exigeNivel: true })
  async cargar(@Req() req: Request, @Body() body: { idPeriodo: string; filas: FilaCarga[] }) {
    return { success: true, data: await this.carga.procesar(body?.idPeriodo, body?.filas, await this.actor(req), true) };
  }

  /** POST /periodos/:id/reutilizar/validar { idPeriodoOrigen, alcance } — qué se copiaría. No escribe. */
  @Post('periodos/:id/reutilizar/validar')
  @EscrituraEn({ periodo: { param: 'id' } })
  async validarReutilizacion(@Req() req: Request, @Param('id') id: string, @Body() body: { idPeriodoOrigen: string; alcance: AlcanceReutilizacion }) {
    return { success: true, data: await this.reutilizacion.reutilizar(id, body?.idPeriodoOrigen, body?.alcance, await this.actor(req), false) };
  }

  /** POST /periodos/:id/reutilizar { idPeriodoOrigen, alcance } — copia; 409 con el reporte si algo impide copiar. */
  @Post('periodos/:id/reutilizar')
  @EscrituraEn({ periodo: { param: 'id' } })
  async reutilizar(@Req() req: Request, @Param('id') id: string, @Body() body: { idPeriodoOrigen: string; alcance: AlcanceReutilizacion }) {
    return { success: true, data: await this.reutilizacion.reutilizar(id, body?.idPeriodoOrigen, body?.alcance, await this.actor(req), true) };
  }
}
