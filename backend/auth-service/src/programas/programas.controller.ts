import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { ProgramasService } from './programas.service';
import type { ProgramasFiltroDto } from './programas.service';
import { CreateProgramaDto, UpdateProgramaDto } from './programa.dto';

@Controller('programas-academicos')
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  @Get()
  listar(@Query() query: ProgramasFiltroDto) {
    return this.programasService.listarProgramas(query);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.programasService.obtenerPrograma(id);
  }

  @Post()
  crear(@Body() dto: CreateProgramaDto) {
    return this.programasService.crearPrograma(dto);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateProgramaDto) {
    return this.programasService.actualizarPrograma(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.programasService.eliminarPrograma(id);
  }
}
