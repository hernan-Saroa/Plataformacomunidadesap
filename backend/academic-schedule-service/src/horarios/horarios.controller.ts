import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';

import { HorariosService, type CrearSesionDto, type PeriodoGrupoDto } from './horarios.service.js';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly horarios: HorariosService) {}

  /** GET /horarios?grupo=<id> — sesiones del grupo, ordenadas. */
  @Get()
  async listar(@Query('grupo') idGrupo: string) {
    return { success: true, data: await this.horarios.listarPorGrupo(idGrupo) };
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
