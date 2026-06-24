import { Controller, Get, Post, Put, Delete, Patch, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ProgramasService } from './programas.service';
import type { ProgramasFiltroDto as IProgramasFiltroDto } from './programas.service';
import { CreateProgramaDto, UpdateProgramaDto, ProgramasFiltroDto } from './programa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('programas-academicos')
@UseGuards(JwtAuthGuard)
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  @Get()
  listar(@Query() query: any) {
    console.log('[DEBUG] Query in listar:', query);
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
  eliminar(@Param('id') id: string, @Query('periodo') periodo?: string) {
    return this.programasService.eliminarPrograma(id, periodo);
  }

  @Get(':id/asignaturas')
  obtenerAsignaturasPrograma(@Param('id') id: string) {
    return this.programasService.obtenerAsignaturasPrograma(id);
  }

  @Post(':id/asignaturas')
  guardarAsignaturasPrograma(@Param('id') id: string, @Body() body: { asignaturas: any[] }) {
    return this.programasService.guardarAsignaturasPrograma(id, body.asignaturas);
  }

  @Patch(':id/cetaps/:ofertaId')
  actualizarCuposCetap(@Param('id') id: string, @Param('ofertaId') ofertaId: string, @Body() body: { cupos: number }) {
    return this.programasService.actualizarCuposCetap(id, ofertaId, body.cupos);
  }
}
