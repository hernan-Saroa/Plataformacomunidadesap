import { Body, Controller, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PROGRAMACION_ALL, PERMISO_PUBLICAR } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { EscrituraEn } from '../acceso/escritura.decorator.js';
import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { rolesDe } from '../acceso/roles.js';
import { PublicacionService } from './publicacion.service.js';

/**
 * Publicación de la programación — NUEVA-1 / EFDS-1937.
 *
 * Publicar y retirar los hace el PROGRAMADOR, cada uno sobre los niveles que
 * programa (EFDS-2303, permiso `programacion-academica.publicar`). Cerrar el
 * periodo y marcar excepciones son actos sobre el periodo completo y siguen
 * exigiendo `programacion-academica.all`.
 *
 * Las consultas devuelven solo los niveles del usuario (EFDS-2302, RN-08).
 */
@Controller('publicaciones')
export class PublicacionController {
  constructor(
    private readonly publicacion: PublicacionService,
    private readonly permisos: ProgramacionPermissionsService,
    private readonly niveles: NivelesRequestService,
  ) {}

  private async exigir(req: Request, permiso: string, mensaje: string): Promise<void> {
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    if (!permisos.has(permiso) && !permisos.has(PERMISO_PROGRAMACION_ALL)) {
      throw new ForbiddenException(mensaje);
    }
  }

  private exigirAdministracion(req: Request): Promise<void> {
    return this.exigir(req, PERMISO_PROGRAMACION_ALL,
      'Cerrar el periodo o marcar excepciones requiere el permiso de administración del módulo.');
  }

  private exigirPublicar(req: Request): Promise<void> {
    return this.exigir(req, PERMISO_PUBLICAR,
      'Publicar la programación requiere el permiso de publicar del programador.');
  }

  /** GET /publicaciones/:idPeriodo — conteos por estado de las franjas de sus niveles. */
  @Get(':idPeriodo')
  async estado(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    return { success: true, data: await this.publicacion.estado(idPeriodo, await this.niveles.de(req)) };
  }

  /** POST /publicaciones/:idPeriodo/publicar — valida sin cruces y publica sus niveles. */
  @Post(':idPeriodo/publicar')
  @EscrituraEn({ periodo: { param: 'idPeriodo' } })
  async publicar(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    await this.exigirPublicar(req);
    return { success: true, data: await this.publicacion.publicar(idPeriodo, await this.niveles.de(req)) };
  }

  /** POST /publicaciones/:idPeriodo/retirar — retira la de sus niveles si nadie tomó franjas. */
  @Post(':idPeriodo/retirar')
  @EscrituraEn({ periodo: { param: 'idPeriodo' } })
  async retirar(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    await this.exigirPublicar(req);
    return { success: true, data: await this.publicacion.retirar(idPeriodo, await this.niveles.de(req)) };
  }

  /** GET /publicaciones/:idPeriodo/pendientes-cierre — franjas de sus niveles que impiden cerrar. */
  @Get(':idPeriodo/pendientes-cierre')
  async pendientesCierre(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    return { success: true, data: await this.publicacion.pendientesCierre(idPeriodo, await this.niveles.de(req)) };
  }

  /** POST /publicaciones/:idPeriodo/cerrar — cierra si todo está aprobado o en excepción. */
  @Post(':idPeriodo/cerrar')
  @EscrituraEn({ periodo: { param: 'idPeriodo' } })
  async cerrar(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    await this.exigirAdministracion(req);
    const usuario = String(req.headers['x-user-id'] || (req as any)?.user?.userId || '') || null;
    return { success: true, data: await this.publicacion.cerrar(idPeriodo, usuario) };
  }

  /** POST /publicaciones/:idPeriodo/excepcion/:idFranja — marca/desmarca excepción. */
  @Post(':idPeriodo/excepcion/:idFranja')
  @EscrituraEn({ periodo: { param: 'idPeriodo' }, franja: { param: 'idFranja' } })
  async excepcion(
    @Req() req: Request,
    @Param('idPeriodo') idPeriodo: string,
    @Param('idFranja') idFranja: string,
    @Body() body: { excepcion?: boolean },
  ) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.publicacion.marcarExcepcion(idPeriodo, idFranja, body?.excepcion !== false) };
  }
}
