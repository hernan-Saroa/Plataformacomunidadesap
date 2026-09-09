import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';

import { HorariosService, type CrearSesionDto, type PeriodoGrupoDto } from './horarios.service.js';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly horarios: HorariosService) {}

  /**
   * GET /horarios?grupo=<id> — sesiones de UN grupo.
   * GET /horarios            — TODAS, con programa, asignatura y docente
   *                            resueltos por JOIN en el servidor.
   *
   * Sin el parámetro se devolvía una lista vacía, y el panel llenaba el hueco
   * con una constante del front. Ahora la ausencia de grupo significa "todas".
   */
  @Get()
  async listar(@Query('grupo') idGrupo?: string) {
    const data = idGrupo
      ? await this.horarios.listarPorGrupo(idGrupo)
      : await this.horarios.listarTodas();
    return { success: true, data };
  }

  /** POST /horarios — crea una sesión con franja arbitraria (AC-01, AC-03). */
  @Post()
  async crear(@Body() body: CrearSesionDto) {
    return { success: true, data: await this.horarios.crearSesion(body) };
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return { success: true, data: await this.horarios.eliminarSesion(id) };
  }

  /** PUT /horarios/grupo/:id/periodo — ciclo de clases del grupo. */
  @Put('grupo/:id/periodo')
  async periodo(@Param('id') id: string, @Body() body: PeriodoGrupoDto) {
    return { success: true, data: await this.horarios.definirPeriodo(id, body) };
  }
}
