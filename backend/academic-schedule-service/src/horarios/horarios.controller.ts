import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
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

  /** POST /horarios/lote/validar — valida un día por día, sin escribir nada (EFDS-2430). */
  @Post('lote/validar')
  @EscrituraEn({ grupo: { body: 'idGrupo' } }, { exigeNivel: true })
  async validarLote(@Body() body: Parameters<HorariosService['validarLote']>[0]) {
    return { success: true, data: await this.horarios.validarLote(body) };
  }

  /** POST /horarios/lote — crea una sesión por día, TODO O NADA (409 con el detalle si algún día choca). */
  @Post('lote')
  @EscrituraEn({ grupo: { body: 'idGrupo' } }, { exigeNivel: true })
  async crearLote(@Req() req: Request, @Body() body: Parameters<HorariosService['crearLote']>[0]) {
    return { success: true, data: await this.horarios.crearLote(body, { idUser: idUserDe(req) }) };
  }

  /** PATCH /horarios/:id — edita día, horas, tipo o aula de una sesión (EFDS-2432), con reglas por estado. */
  @Patch(':id')
  @EscrituraEn({ franja: { param: 'id' } }, { exigeNivel: true })
  async actualizar(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return { success: true, data: await this.horarios.actualizarSesion(id, body ?? {}, { idUser: idUserDe(req) }) };
  }

  /** DELETE /horarios/:id?confirmarDevolucion=true|false — elimina una sesión con las mismas reglas por estado. */
  @Delete(':id')
  @EscrituraEn({ franja: { param: 'id' } }, { exigeNivel: true })
  async eliminar(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Query('confirmarDevolucion') confirmar?: string) {
    return { success: true, data: await this.horarios.eliminarSesion(id, { confirmarDevolucion: confirmar === 'true' }, { idUser: idUserDe(req) }) };
  }

  /** PUT /horarios/grupo/:id/periodo — ciclo de clases del grupo. */
  @Put('grupo/:id/periodo')
  @EscrituraEn({ grupo: { param: 'id' } }, { exigeNivel: true })
  async periodo(@Param('id', ParseUUIDPipe) id: string, @Body() body: PeriodoGrupoDto) {
    return { success: true, data: await this.horarios.definirPeriodo(id, body) };
  }

  /** GET /horarios/grupo/:id/horas — programadas vs requeridas (§1.3). */
  @Get('grupo/:id/horas')
  @LecturaEn({ grupo: { param: 'id' } })
  async horas(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.horarios.horasGrupo(id) };
  }
}

function idUserDe(req: Request): string | null {
  const id = String(req.headers['x-user-id'] || (req as any)?.user?.userId || '').trim();
  return id || null;
}
