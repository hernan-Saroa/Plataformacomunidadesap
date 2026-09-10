import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PROGRAMACION_ALL } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { AulasService, type ActualizarAulaDto, type CrearAulaDto } from './aulas.service.js';

/**
 * Aulas y disponibilidad de espacio — EFDS-1374.
 *
 * La disponibilidad respeta RN-07: día y hora de lo ocupado, nunca qué grupo lo
 * ocupa. La garantía está en el servicio (no selecciona esos campos), no aquí.
 *
 * El CRUD de aulas (EFDS-1942) es administración del dato maestro de espacios:
 * exige `programacion-academica.all`, igual que crear/activar periodos. Listar y
 * ver disponibilidad siguen abiertos a cualquier perfil del módulo.
 */
@Controller('aulas')
export class AulasController {
  constructor(
    private readonly aulas: AulasService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  /**
   * Permisos resueltos EN EL SERVIDOR desde los roles del token. El gateway no
   * propaga `req.user`: reenvía la identidad en `x-user-roles`.
   */
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

  /** Fail-closed: sin el permiso de administración, no se toca el catálogo de aulas. */
  private async exigirAdministracion(req: Request): Promise<void> {
    const permisos = await this.permisosDe(req);
    if (!permisos.has(PERMISO_PROGRAMACION_ALL)) {
      throw new ForbiddenException(
        'Administrar aulas requiere el permiso de administración del módulo.',
      );
    }
  }

  /** GET /aulas — catálogo de aulas (datos provisionales, C-4). */
  @Get()
  async listar() {
    return { success: true, data: await this.aulas.listar() };
  }

  /** GET /aulas/:codigo/disponibilidad — franjas ocupadas: solo día y hora. */
  @Get(':codigo/disponibilidad')
  async disponibilidad(@Param('codigo') codigo: string) {
    return { success: true, data: await this.aulas.disponibilidad(codigo) };
  }

  /** POST /aulas/publicar/:idGrupo — publica la oferta; exige aula en toda franja. */
  @Post('publicar/:idGrupo')
  async publicar(@Param('idGrupo') idGrupo: string) {
    return { success: true, data: await this.aulas.publicarGrupo(idGrupo) };
  }

  /** POST /aulas — crea un aula (EFDS-1942). */
  @Post()
  async crear(@Req() req: Request, @Body() body: CrearAulaDto) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.aulas.crear(body) };
  }

  /** PATCH /aulas/:codigo — actualiza nombre, capacidad, sede, tipo o piso. */
  @Patch(':codigo')
  async actualizar(@Req() req: Request, @Param('codigo') codigo: string, @Body() body: ActualizarAulaDto) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.aulas.actualizar(codigo, body) };
  }

  /** DELETE /aulas/:codigo — elimina un aula sin franjas que la referencien. */
  @Delete(':codigo')
  async eliminar(@Req() req: Request, @Param('codigo') codigo: string) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.aulas.eliminar(codigo) };
  }
}
