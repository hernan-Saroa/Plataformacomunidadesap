import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { GruposService, type ActualizarGrupoDto, type CrearGrupoDto } from './grupos.service.js';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  /** POST /grupos — crea 1..N grupos de una asignatura (AC-01). */
  @Post()
  async crear(@Body() body: CrearGrupoDto) {
    const data = await this.gruposService.crear(body);
    return { success: true, data };
  }

  /** GET /grupos?asignatura=<id> — grupos de la asignatura, por numeración. */
  @Get()
  async listar(@Query('asignatura') idAsignatura: string) {
    const data = await this.gruposService.listarPorAsignatura(idAsignatura);
    return { success: true, data };
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return { success: true, data: await this.gruposService.obtener(id) };
  }

  /** PATCH /grupos/:id — solo campos propios; no mueve de asignatura ni renumera. */
  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() body: ActualizarGrupoDto) {
    return { success: true, data: await this.gruposService.actualizar(id, body) };
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return { success: true, data: await this.gruposService.eliminar(id) };
  }
}
