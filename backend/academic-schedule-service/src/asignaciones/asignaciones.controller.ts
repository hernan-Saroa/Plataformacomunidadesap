import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { AcumuladoService } from './acumulado.service.js';
import { tokenDe } from '../acceso/token.js';
import { AsignacionesService, type AsignarDocenteDto } from './asignaciones.service.js';
import { EscrituraEn } from '../acceso/escritura.decorator.js';
import { rolesDe } from '../acceso/roles.js';
import { puedeAsignarDocentes, puedeVerDisponibilidadDocente } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';

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
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  /**
   * El panel del docente (situación, horas, tope) es del backoffice: lo ve quien
   * consulta la disponibilidad docente o asigna docentes. Antes bastaba cualquier
   * token válido, incluido el de un docente.
   */
  private async exigirConsulta(req: Request): Promise<void> {
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    if (!puedeVerDisponibilidadDocente(permisos) && !puedeAsignarDocentes(permisos)) {
      throw new ForbiddenException('No tiene permiso para consultar la disponibilidad de los docentes.');
    }
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
    await this.exigirConsulta(req);
    const data = await this.asignaciones.consultarDocente(documento, idGrupo, tokenDe(req));
    return { success: true, data };
  }

  /**
   * GET /asignaciones/candidatos?grupo=<id>&franjas=<id>,<id> — EFDS-2341.
   *
   * Docentes del área de la asignatura para las franjas pedidas (todas si no se
   * indican), con sus bloqueos en seco y el sugerido con sus razones. Solo lectura.
   */
  @Get('candidatos')
  async candidatos(@Req() req: Request, @Query('grupo', ParseUUIDPipe) idGrupo: string, @Query('franjas') franjas?: string) {
    await this.exigirConsulta(req);
    const ids = franjas ? franjas.split(',').map((x) => x.trim()).filter(Boolean) : undefined;
    return { success: true, data: await this.asignaciones.candidatos(idGrupo, ids, tokenDe(req)) };
  }

  /** GET /asignaciones/acumulado/:documento — consumo transversal por oferta y tope (RN-04/05/06). */
  @Get('acumulado/:documento')
  async acumuladoDocente(@Req() req: Request, @Param('documento') documento: string) {
    await this.exigirConsulta(req);
    return { success: true, data: await this.acumulado.consumo(documento, tokenDe(req)) };
  }

  /**
   * POST /asignaciones — asigna el docente al grupo (bloqueo duro).
   *
   * Devuelve `{ asignado: false, motivos }` con TODOS los motivos si alguna regla
   * falla; en ese caso no se guardó nada. El impacto en horas lo calcula el
   * contrato; el cliente no lo fija.
   */
  @Post()
  @EscrituraEn({ grupo: { body: 'idGrupo' } }, { exigeNivel: 'asignacion' })
  async asignar(@Req() req: Request, @Body() body: AsignarDocenteDto) {
    // Quién asignó sale del token, no del cuerpo (trazabilidad, EFDS-2342).
    const data = await this.asignaciones.asignar({ ...body, asignadoPor: idUserDe(req) ?? body?.asignadoPor }, tokenDe(req));
    return { success: true, data };
  }

  /** DELETE /asignaciones/grupo/:idGrupo — retira la asignación y libera sus franjas. */
  @Delete('grupo/:idGrupo')
  @EscrituraEn({ grupo: { param: 'idGrupo' } }, { exigeNivel: 'asignacion' })
  async retirar(@Param('idGrupo', ParseUUIDPipe) idGrupo: string) {
    const data = await this.asignaciones.retirar(idGrupo);
    return { success: true, data };
  }
}

function idUserDe(req: Request): string | null {
  const id = String(req.headers['x-user-id'] || (req as any)?.user?.userId || '').trim();
  return id || null;
}
