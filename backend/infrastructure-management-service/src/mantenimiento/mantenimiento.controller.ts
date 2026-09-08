import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MantenimientoService } from './mantenimiento.service.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto } from './dto/create-mantenimiento.dto.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Mantenimiento e Infraestructura')
@ApiBearerAuth()
@Controller('mantenimiento')
export class MantenimientoController {
  constructor(private readonly mantenimientoService: MantenimientoService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar solicitudes de mantenimiento' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'prioridad', required: false })
  findAll(@Query('estado') estado?: string, @Query('prioridad') prioridad?: string) {
    return this.mantenimientoService.findAll(estado, prioridad);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una solicitud de mantenimiento' })
  findById(@Param('id') id: string) {
    return this.mantenimientoService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva solicitud de mantenimiento' })
  create(@Body() dto: CreateMantenimientoDto) {
    return this.mantenimientoService.create(dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado y responsable de una solicitud' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateMantenimientoEstadoDto) {
    return this.mantenimientoService.updateEstado(id, dto);
  }
}
