import {
  Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PROGRAMACION_ALL } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { OfertasService, type CrearPeriodoDto } from './ofertas.service.js';

/**
 * Ofertas académicas y consumo por oferta — EFDS-1375.
 *
 * Crear y activar periodos (NUEVA-5a) exigen `programacion-academica.all`: son
 * actos de administración del módulo, no de programación diaria. Listar sigue
 * abierto a cualquier perfil del módulo.
 */
@Controller('ofertas')
export class OfertasController {
  constructor(
    private readonly ofertas: OfertasService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  /**
   * Permisos resueltos EN EL SERVIDOR a partir de los roles del token. El
   * gateway no propaga `req.user`: reenvía la identidad en `x-user-roles`.
   * Leer solo `req.user` dejaba el catálogo en 403 detrás del gateway.
   */
  private async permisosDe(req: Request): Promise<Set<string>> {
    const desdeHeader = String(req.headers['x-user-roles'] || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const desdeUser = Array.isArray((req as any)?.user?.roles)
      ? (req as any).user.roles
          .map((r: any) => (typeof r === 'string' ? r : r?.code ?? r?.name))
          .filter(Boolean)
      : [];

    const codes = desdeHeader.length > 0 ? desdeHeader : desdeUser;
    return this.permisos.resolveForRoles(codes);
  }

  /** Fail-closed: sin el permiso de administración, no se toca el periodo. */
  private async exigirAdministracion(req: Request): Promise<void> {
    const permisos = await this.permisosDe(req);
    if (!permisos.has(PERMISO_PROGRAMACION_ALL)) {
      throw new ForbiddenException(
        'Administrar periodos requiere el permiso de administración del módulo.',
      );
    }
  }

  /** GET /ofertas — las ofertas académicas (periodo + tipo). */
  @Get()
  async listar() {
    return { success: true, data: await this.ofertas.listar() };
  }

  /** GET /ofertas/consumo/:documento — consumo del docente por oferta vs tope. */
  @Get('consumo/:documento')
  async consumo(@Param('documento') documento: string) {
    return { success: true, data: await this.ofertas.consumoPorOferta(documento) };
  }

  /** POST /ofertas — crea un periodo. Nace en 'planeacion' (NUEVA-5a). */
  @Post()
  async crear(@Req() req: Request, @Body() body: CrearPeriodoDto) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.ofertas.crear(body) };
  }

  /**
   * PATCH /ofertas/:id/activar — activa el periodo.
   *
   * Sin condiciones y sin exclusividad: varios pueden estar activos a la vez.
   * CERRAR no vive aquí: depende del flujo de aprobación de NUEVA-3 (NUEVA-5b).
   */
  @Patch(':id/activar')
  async activar(@Req() req: Request, @Param('id') id: string) {
    await this.exigirAdministracion(req);
    return { success: true, data: await this.ofertas.activar(id) };
  }
}
