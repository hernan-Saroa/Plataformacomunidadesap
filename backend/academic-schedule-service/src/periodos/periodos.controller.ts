import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { PERMISO_PROGRAMACION_ALL } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { EscrituraEn } from '../acceso/escritura.decorator.js';
import { idUserDe, rolesDe } from '../acceso/roles.js';
import { CalendarioAcademicoService } from './calendario-academico.service.js';
import { PeriodosService } from './periodos.service.js';

/** Periodos de la plataforma con el estado de su programación — EFDS-2328. */
@Controller('periodos')
export class PeriodosController {
  constructor(
    private readonly periodos: PeriodosService,
    private readonly permisos: ProgramacionPermissionsService,
    private readonly niveles: NivelesRequestService,
    private readonly calendario: CalendarioAcademicoService,
  ) {}

  /** GET /periodos — contrato en INTEGRACION-claude.md, sección 1. */
  @Get()
  async listar(@Req() req: Request) {
    await this.niveles.de(req); // exige algún nivel del módulo
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    return { success: true, data: await this.periodos.listar(permisos) };
  }

  /** GET /periodos/festivos?anio= — festivos del año y si están cargados (EFDS-2347). */
  @Get('festivos')
  async festivos(@Req() req: Request, @Query('anio') anio: string) {
    await this.niveles.de(req);
    return { success: true, data: await this.calendario.festivos(Number(anio)) };
  }

  /** GET /periodos/:idPeriodo/recesos — recesos del periodo, iguales para todos sus grupos. */
  @Get(':idPeriodo/recesos')
  async recesos(@Req() req: Request, @Param('idPeriodo') idPeriodo: string) {
    await this.niveles.de(req);
    return { success: true, data: await this.calendario.recesos(idPeriodo) };
  }

  /** POST /periodos/:idPeriodo/recesos { fechaInicio, fechaFin, motivo } — administración del módulo. */
  @Post(':idPeriodo/recesos')
  @EscrituraEn({ periodo: { param: 'idPeriodo' } })
  async crearReceso(@Req() req: Request, @Param('idPeriodo') idPeriodo: string,
    @Body() body: { fechaInicio?: string; fechaFin?: string; motivo?: string }) {
    await this.exigirAdmin(req);
    return { success: true, data: await this.calendario.crearReceso(idPeriodo, body, idUserDe(req) || null) };
  }

  /** DELETE /periodos/:idPeriodo/recesos/:idReceso — administración del módulo. */
  @Delete(':idPeriodo/recesos/:idReceso')
  @EscrituraEn({ periodo: { param: 'idPeriodo' } })
  async quitarReceso(@Req() req: Request, @Param('idPeriodo') idPeriodo: string,
    @Param('idReceso', ParseUUIDPipe) idReceso: string) {
    await this.exigirAdmin(req);
    return { success: true, data: await this.calendario.quitarReceso(idPeriodo, idReceso) };
  }

  private async exigirAdmin(req: Request): Promise<void> {
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    if (!permisos.has(PERMISO_PROGRAMACION_ALL)) {
      throw new ForbiddenException('Solo la administración del módulo registra los recesos del periodo.');
    }
  }
}
