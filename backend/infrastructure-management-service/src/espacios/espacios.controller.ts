import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EspaciosService } from './espacios.service.js';
import { CreateEspacioDto, UpdateEstadoEspacioDto } from './dto/create-espacio.dto.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Espacios Físicos')
@ApiBearerAuth()
@Controller('espacios')
export class EspaciosController {
  constructor(private readonly espaciosService: EspaciosService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar espacios físicos con filtros opcionales' })
  @ApiQuery({ name: 'tipo', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'idBloque', required: false })
  findAll(
    @Query('tipo') tipo?: string,
    @Query('estado') estado?: string,
    @Query('idBloque') idBloque?: string,
  ) {
    return this.espaciosService.findAll(tipo, estado, idBloque);
  }

  @Get('estadisticas')
  @Public()
  @ApiOperation({ summary: 'Obtener métricas y estadísticas globales de espacios' })
  getEstadisticas() {
    return this.espaciosService.getEstadisticas();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de un espacio físico por ID' })
  findById(@Param('id') id: string) {
    return this.espaciosService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo espacio físico (aula, laboratorio, auditorio)' })
  create(@Body() dto: CreateEspacioDto) {
    return this.espaciosService.create(dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado de disponibilidad de un espacio' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateEstadoEspacioDto) {
    return this.espaciosService.updateEstado(id, dto);
  }
}
