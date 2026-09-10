import { Controller, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PROGRAMACION_ALL } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { PublicacionService } from './publicacion.service.js';

/**
 * Publicación de la programación — NUEVA-1 / EFDS-1937.
 *
 * Publicar y retirar son actos de administración del periodo: exigen
 * `programacion-academica.all`, igual que crear/activar periodos y el CRUD de
 * aulas. Consultar el estado queda abierto a cualquier perfil del módulo.
 */
@Controller('publicaciones')
export class PublicacionController {
  constructor(
    private readonly publicacion: PublicacionService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  private async permisosDe(req: Request): Promise<Set<string>> {
    const desdeHeader = String(req.headers['x-user-roles'] || '')
      .split(',').map((r) => r.trim()).filter(Boolean);
    const desdeUser = Array.isArray((req as any)?.user?.roles)
      ? (req as any).user.roles
          .map((r: any) => (typeof r === 'string' ? r : r?.code ?? r?.name)).filter(Boolean)
      : [];
    const codes = desdeHeader.length > 0 ? desdeHeader : desdeUser;
    return this.permisos.resolveForRoles(codes);
  }

  private async exigirAdministracion(req: Request): Promise<void> {
    const permisos = await this.permisosDe(req);
    if (!permisos.has(PERMISO_PROGRAMACION_ALL)) {
      throw new ForbiddenException(
        'Publicar la programación requiere el permiso de administración del módulo.',
      );
    }
  }

  /** GET /publicaciones/:idPeriodo — conteos por estado de las franjas del periodo. */
  @Get(':idPeriodo')
  async estado(@Param('idPeriodo') idPeriodo: string) {
    return { success: true, data: await this.publicacion.estado(idPeriodo) };
  }

  /** POST /publicaciones/:idPeriodo/publicar — valida sin cruces y publica. */
  @Post(':idPeriodo/publicar')
  async publicar(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.publicacion.publicar(idPeriodo) };
  }

  /** POST /publicaciones/:idPeriodo/retirar — retira si nadie tomó franjas. */
  @Post(':idPeriodo/retirar')
  async retirar(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.publicacion.retirar(idPeriodo) };
  }
}
