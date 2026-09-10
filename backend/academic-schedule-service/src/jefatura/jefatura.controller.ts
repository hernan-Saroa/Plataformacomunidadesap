import { Body, Controller, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { JefaturaService } from './jefatura.service.js';

const PERMISO_APROBACION = 'programacion-academica.aprobacion.territorial';

/**
 * Aprobación de la jefatura territorial — EFDS-1939.
 *
 * Exige `programacion-academica.aprobacion.territorial` (rol JEFATURA_TERRITORIAL,
 * migración 027). La territorial concreta se resuelve en el servidor desde el
 * token; el jefe no elige territorial por parámetro.
 */
@Controller('jefatura')
export class JefaturaController {
  constructor(
    private readonly jefatura: JefaturaService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  private roles(req: Request): string[] {
    const desdeHeader = String(req.headers['x-user-roles'] || '')
      .split(',').map((r) => r.trim()).filter(Boolean);
    if (desdeHeader.length) return desdeHeader;
    return Array.isArray((req as any)?.user?.roles)
      ? (req as any).user.roles.map((r: any) => (typeof r === 'string' ? r : r?.code ?? r?.name)).filter(Boolean)
      : [];
  }

  private idUser(req: Request): string {
    return String(req.headers['x-user-id'] || (req as any)?.user?.userId || '');
  }

  private async exigirAprobacion(req: Request): Promise<void> {
    const permisos = await this.permisos.resolveForRoles(this.roles(req));
    if (!permisos.has(PERMISO_APROBACION)) {
      throw new ForbiddenException('Aprobar programación requiere el permiso de jefatura territorial.');
    }
  }

  /** GET /jefatura/pendientes — franjas tomadas por docentes de mi territorial. */
  @Get('pendientes')
  async pendientes(@Req() req: Request) {
    await this.exigirAprobacion(req);
    return { success: true, data: await this.jefatura.pendientes(this.idUser(req)) };
  }

  /** POST /jefatura/aprobar/:idFranja — TOMADA → APROBADA. */
  @Post('aprobar/:idFranja')
  async aprobar(@Req() req: Request, @Param('idFranja') idFranja: string) {
    await this.exigirAprobacion(req);
    return { success: true, data: await this.jefatura.aprobar(this.idUser(req), idFranja) };
  }

  /** POST /jefatura/devolver/:idFranja — TOMADA → PUBLICADA con comentario. */
  @Post('devolver/:idFranja')
  async devolver(@Req() req: Request, @Param('idFranja') idFranja: string, @Body() body: { comentario?: string }) {
    await this.exigirAprobacion(req);
    return { success: true, data: await this.jefatura.devolver(this.idUser(req), idFranja, body?.comentario ?? '') };
  }
}
