import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EspaciosService } from './espacios.service.js';
import { CreateEspacioDto, UpdateEstadoEspacioDto } from './dto/create-espacio.dto.js';
import type { UpdateEspacioDto } from './dto/create-espacio.dto.js';
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
  @ApiQuery({ name: 'idSede', required: false })
  @ApiQuery({ name: 'soloActivos', required: false })
  findAll(
    @Query('tipo') tipo?: string,
    @Query('estado') estado?: string,
    @Query('idBloque') idBloque?: string,
    @Query('idSede') idSede?: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    const flagSoloActivos = soloActivos === undefined ? true : String(soloActivos).toLowerCase() !== 'false';
    return this.espaciosService.findAll({ tipo, estado, idBloque, idSede, soloActivos: flagSoloActivos });
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
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.espaciosService.findById(id);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Crear un nuevo espacio físico (aula, laboratorio, auditorio)' })
  @ApiResponse({ status: 201, description: 'Espacio físico creado correctamente.' })
  @ApiResponse({ status: 409, description: 'Código duplicado en el mismo bloque.' })
  create(@Body() dto: CreateEspacioDto) {
    return this.espaciosService.create(dto);
  }

  @Patch(':id')
  @Public()
  @ApiOperation({ summary: 'Actualizar cualquier campo de un espacio físico (incluyendo estado e isActivo).' })
  updateEspacio(@Param('id', ParseUUIDPipe) id: string, @Body() payload: UpdateEspacioDto) {
    return this.espaciosService.updateEspacio(id, payload);
  }

  @Patch(':id/estado')
  @Public()
  @ApiOperation({ summary: 'Actualizar estado de disponibilidad de un espacio (atajo)' })
  updateEstado(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstadoEspacioDto) {
    return this.espaciosService.updateEstado(id, dto);
  }

  @Patch(':id/toggle')
  @Public()
  @ApiOperation({ summary: 'Cambiar soft-delete isActivo del espacio. Flip estado a INACTIVO / DISPONIBLE coherente.' })
  toggleEspacio(@Param('id', ParseUUIDPipe) id: string) {
    return this.espaciosService.toggleEspacioActivo(id);
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: 'Eliminar físicamente un espacio (sin relaciones fuertes aún).' })
  deleteEspacio(@Param('id', ParseUUIDPipe) id: string) {
    return this.espaciosService.deleteEspacio(id);
  }
}
