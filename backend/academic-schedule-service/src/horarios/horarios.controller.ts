import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { HorariosService, type CrearSesionDto, type PeriodoGrupoDto } from './horarios.service.js';
import { EscrituraEn, LecturaEn } from '../acceso/escritura.decorator.js';
import { NivelesRequestService } from '../acceso/niveles-request.service.js';

@Controller('horarios')
export class HorariosController {
  constructor(
    private readonly horarios: HorariosService,
    private readonly niveles: NivelesRequestService,
  ) {}

  /**
   * GET /horarios?grupo=<id> — sesiones de UN grupo.
   * GET /horarios            — TODAS, con programa, asignatura y docente
   *                            resueltos por JOIN en el servidor.
   *
   * Sin el parámetro se devolvía una lista vacía, y el panel llenaba el hueco
   * con una constante del front. Ahora la ausencia de grupo significa "todas".
   */
  @Get()
  @LecturaEn({ grupo: { query: 'grupo' } })
  async listar(@Req() req: Request, @Query('grupo') idGrupo?: string, @Query('periodo') idPeriodo?: string) {
    // RN-08 (EFDS-2302): el grupo lo valida el guard; la lista general se filtra
    // en SQL por los niveles que el usuario puede programar.
    const data = idGrupo
      ? await this.horarios.listarPorGrupo(idGrupo)
      : await this.horarios.listarTodas(idPeriodo, await this.niveles.de(req));
    return { success: true, data };
  }

  /** POST /horarios — crea una sesión con franja arbitraria (AC-01, AC-03). */
  @Post()
  @EscrituraEn({ grupo: { body: 'idGrupo' } }, { exigeNivel: true })
  async crear(@Body() body: CrearSesionDto) {
    return { success: true, data: await this.horarios.crearSesion(body) };
  }

  @Delete(':id')
  @EscrituraEn({ franja: { param: 'id' } }, { exigeNivel: true })
  async eliminar(@Param('id') id: string) {
    return { success: true, data: await this.horarios.eliminarSesion(id) };
  }

  /** PUT /horarios/grupo/:id/periodo — ciclo de clases del grupo. */
  @Put('grupo/:id/periodo')
  @EscrituraEn({ grupo: { param: 'id' } }, { exigeNivel: true })
  async periodo(@Param('id') id: string, @Body() body: PeriodoGrupoDto) {
    return { success: true, data: await this.horarios.definirPeriodo(id, body) };
  }

  /** GET /horarios/grupo/:id/horas — programadas vs requeridas (§1.3). */
  @Get('grupo/:id/horas')
  @LecturaEn({ grupo: { param: 'id' } })
  async horas(@Param('id') id: string) {
    return { success: true, data: await this.horarios.horasGrupo(id) };
  }
}
