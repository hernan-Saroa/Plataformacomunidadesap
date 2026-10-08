import { Controller, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PORTAL_TOMAR, PERMISO_PORTAL_VER } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { PortalDocenteService } from './portal-docente.service.js';

/**
 * Portal del docente — EFDS-1938.
 *
 * Ver exige `portal-transaccional.programacion-academica.view`; tomar y soltar,
 * `.tomar`. La identidad del docente se resuelve en el servidor desde el token
 * (`x-user-id`), nunca desde el cuerpo del request.
 */
@Controller('portal-docente')
export class PortalDocenteController {
  constructor(
    private readonly portal: PortalDocenteService,
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

  private async exigir(req: Request, permiso: string): Promise<void> {
    const permisos = await this.permisos.resolvePortal(this.roles(req));
    if (!permisos.has(permiso)) {
      throw new ForbiddenException('No tiene acceso al portal de programación del docente.');
    }
  }

  /** GET /portal-docente/disponibles — franjas publicadas que puede tomar. */
  @Get('disponibles')
  async disponibles(@Req() req: Request) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.disponibles(docente.idPerson) };
  }

  /** GET /portal-docente/mis-franjas — franjas que ya tomó (o le aprobaron). */
  @Get('mis-franjas')
  async misFranjas(@Req() req: Request) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.misFranjas(docente.idPerson) };
  }

  /** GET /portal-docente/acumulado — consumo del docente vs tope (RN-04, solo lectura). */
  @Get('acumulado')
  async acumulado(@Req() req: Request) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.acumulado(docente.documento) };
  }

  /** POST /portal-docente/tomar/:idFranja — toma una franja (transacción + lock). */
  @Post('tomar/:idFranja')
  async tomar(@Req() req: Request, @Param('idFranja') idFranja: string) {
    await this.exigir(req, PERMISO_PORTAL_TOMAR);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.tomar(docente.idPerson, idFranja) };
  }

  /** POST /portal-docente/soltar/:idFranja — suelta una franja tomada no aprobada. */
  @Post('soltar/:idFranja')
  async soltar(@Req() req: Request, @Param('idFranja') idFranja: string) {
    await this.exigir(req, PERMISO_PORTAL_TOMAR);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.soltar(docente.idPerson, idFranja) };
  }
}
