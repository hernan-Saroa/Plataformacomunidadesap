import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PORTAL_TOMAR, PERMISO_PORTAL_VER } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { PortalDocenteService } from './portal-docente.service.js';
import { tokenDe } from '../acceso/token.js';
import { EscrituraEn } from '../acceso/escritura.decorator.js';
import { tomaDeFranjasHabilitada } from './flujo-docente.js';
import { VistaService } from '../vista/vista.service.js';
import { HorarioDocenteService, type FranjaDefinible } from './horario-docente.service.js';

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
    private readonly vista: VistaService,
    private readonly horario: HorarioDocenteService,
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

  /**
   * GET /portal-docente/configuracion — qué flujo rige (EFDS-2348). Con
   * `tomaFranjas: false` el docente recibe su programación asignada y no toma ni suelta.
   */
  @Get('configuracion')
  async configuracion(@Req() req: Request) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    return { success: true, data: { tomaFranjas: tomaDeFranjasHabilitada() } };
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

  /**
   * GET /portal-docente/mi-calendario?periodo= — su programación asignada, de lunes a
   * domingo, con asignatura, grupo, aula y horas (EFDS-2343/2348). Sin periodo, el en curso.
   * La identidad sale del token: un docente no ve el calendario de otro.
   */
  @Get('mi-calendario')
  async miCalendario(@Req() req: Request, @Query('periodo') periodo?: string) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const yo = await this.portal.resolverDocente(this.idUser(req));
    const docente = await this.vista.docentePor({ idDocente: yo.idPerson });
    const idPeriodo = periodo || (await this.vista.periodoEnCurso());
    return { success: true, data: await this.vista.calendario(docente, idPeriodo, 'todos', tokenDe(req)) };
  }

  /** GET /portal-docente/acumulado — consumo del docente vs tope (RN-04, solo lectura). */
  @Get('acumulado')
  async acumulado(@Req() req: Request) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.acumulado(docente.documento, tokenDe(req)) };
  }

  /**
   * GET /portal-docente/grupos-virtuales — grupos virtuales asignados al docente, con su
   * horario, las horas requeridas y programadas, y si puede cambiarlo ahora (063).
   */
  @Get('grupos-virtuales')
  async gruposVirtuales(@Req() req: Request) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const yo = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.horario.grupos(yo.idPerson) };
  }

  /** POST /portal-docente/grupos-virtuales/:idGrupo/franjas { diaSemana, horaInicio, horaFin } */
  @Post('grupos-virtuales/:idGrupo/franjas')
  @EscrituraEn({ grupo: { param: 'idGrupo' } })
  async definirFranja(@Req() req: Request, @Param('idGrupo', ParseUUIDPipe) idGrupo: string, @Body() body: FranjaDefinible) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const yo = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.horario.crearFranja(yo.idPerson, idGrupo, body, tokenDe(req)) };
  }

  /** DELETE /portal-docente/grupos-virtuales/:idGrupo/franjas/:idFranja — quita una sesión que definió. */
  @Delete('grupos-virtuales/:idGrupo/franjas/:idFranja')
  @EscrituraEn({ grupo: { param: 'idGrupo' } })
  async quitarFranja(
    @Req() req: Request,
    @Param('idGrupo', ParseUUIDPipe) idGrupo: string,
    @Param('idFranja', ParseUUIDPipe) idFranja: string,
  ) {
    await this.exigir(req, PERMISO_PORTAL_VER);
    const yo = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.horario.eliminarFranja(yo.idPerson, idGrupo, idFranja) };
  }

  /** POST /portal-docente/tomar/:idFranja — toma una franja (transacción + lock). */
  @Post('tomar/:idFranja')
  @EscrituraEn({ franja: { param: 'idFranja' } })
  async tomar(@Req() req: Request, @Param('idFranja', ParseUUIDPipe) idFranja: string) {
    await this.exigir(req, PERMISO_PORTAL_TOMAR);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.tomar(docente.idPerson, idFranja, tokenDe(req)) };
  }

  /** POST /portal-docente/soltar/:idFranja — suelta una franja tomada no aprobada. */
  @Post('soltar/:idFranja')
  @EscrituraEn({ franja: { param: 'idFranja' } })
  async soltar(@Req() req: Request, @Param('idFranja', ParseUUIDPipe) idFranja: string) {
    await this.exigir(req, PERMISO_PORTAL_TOMAR);
    const docente = await this.portal.resolverDocente(this.idUser(req));
    return { success: true, data: await this.portal.soltar(docente.idPerson, idFranja) };
  }
}
