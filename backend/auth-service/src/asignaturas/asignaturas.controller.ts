import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { AsignaturasService } from './asignaturas.service';

@Controller('asignaturas')
export class AsignaturasController {
  constructor(private readonly asignaturasService: AsignaturasService) {}

  @Get()
  async listar(@Query() filtros: any) {
    return this.asignaturasService.listar(filtros);
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.asignaturasService.obtener(id);
  }

  @Post()
  async crear(@Body() asignatura: any) {
    return this.asignaturasService.crear(asignatura);
  }

  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() asignatura: any) {
    return this.asignaturasService.actualizar(id, asignatura);
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return this.asignaturasService.eliminar(id);
  }
}