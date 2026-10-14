import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { GruposService, type ActualizarGrupoDto, type CrearGrupoDto } from './grupos.service.js';
import { EscrituraEn, LecturaEn } from '../acceso/escritura.decorator.js';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  /** POST /grupos — crea 1..N grupos de una asignatura (AC-01). */
  @Post()
  @EscrituraEn({ periodo: { body: 'idPeriodo' }, asignatura: { body: 'idAsignatura' } }, { exigeNivel: true })
  async crear(@Body() body: CrearGrupoDto) {
    const data = await this.gruposService.crear(body);
    return { success: true, data };
  }

  /** GET /grupos?asignatura=<id> — grupos de la asignatura, por numeración. */
  @Get()
  @LecturaEn({ asignatura: { query: 'asignatura' } })
  async listar(@Query('asignatura') idAsignatura: string, @Query('periodo') idPeriodo?: string) {
    const data = await this.gruposService.listarPorAsignatura(idAsignatura, idPeriodo);
    return { success: true, data };
  }

  /**
   * GET /grupos/ofertas-cetap?asignatura=<id>&periodo=<idPeriodo> — dónde se
   * puede dictar un grupo (selector de la pantalla de grupos). EFDS-2315.
   */
  @Get('ofertas-cetap')
  @LecturaEn({ asignatura: { query: 'asignatura' } })
  async ofertasCetap(@Query('asignatura') idAsignatura: string, @Query('periodo') idPeriodo: string) {
    return { success: true, data: await this.gruposService.ofertasCetap(idAsignatura, idPeriodo) };
  }

  @Get(':id')
  @LecturaEn({ grupo: { param: 'id' } })
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.gruposService.obtener(id) };
  }

  /** PATCH /grupos/:id — solo campos propios; no mueve de asignatura ni renumera. */
  @Patch(':id')
  @EscrituraEn({ grupo: { param: 'id' } }, { exigeNivel: true })
  async actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() body: ActualizarGrupoDto) {
    return { success: true, data: await this.gruposService.actualizar(id, body) };
  }

  @Delete(':id')
  @EscrituraEn({ grupo: { param: 'id' } }, { exigeNivel: true })
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.gruposService.eliminar(id) };
  }
}
