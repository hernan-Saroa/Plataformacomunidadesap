import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MantenimientoService } from './mantenimiento.service.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto } from './dto/create-mantenimiento.dto.js';
import { Public } from '../auth/public.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@ApiTags('Mantenimiento e Infraestructura')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mantenimiento')
export class MantenimientoController {
  constructor(private readonly mantenimientoService: MantenimientoService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar solicitudes de mantenimiento (bandeja general)' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'prioridad', required: false })
  findAll(@Query('estado') estado?: string, @Query('prioridad') prioridad?: string) {
    return this.mantenimientoService.findAll(estado, prioridad);
  }

  @Get('mis-solicitudes')
  @ApiOperation({ summary: 'Consultar las solicitudes radicadas por el usuario autenticado' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  findMisSolicitudes(@Req() req: any) {
    const usuarioId = req?.user?.userId;
    return this.mantenimientoService.findByUsuario(usuarioId);
  }

  @Post()
  @ApiOperation({ summary: 'Radicación oficial de una solicitud de mantenimiento (EFDS-1730)' })
  @ApiResponse({ status: 201, description: 'Solicitud radicada con consecutivo y estado RECIBIDA' })
  @ApiResponse({ status: 400, description: 'Datos invalidos o sede inactiva' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  create(@Body() dto: CreateMantenimientoDto, @Req() req: any) {
    const user = req?.user;
    return this.mantenimientoService.create(dto, user);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una solicitud de mantenimiento' })
  findById(@Param('id') id: string) {
    return this.mantenimientoService.findById(id);
  }

  @Patch(':id/estado')
  @Public()
  @ApiOperation({ summary: 'Actualizar estado y responsable de una solicitud' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateMantenimientoEstadoDto) {
    return this.mantenimientoService.updateEstado(id, dto);
  }
}
