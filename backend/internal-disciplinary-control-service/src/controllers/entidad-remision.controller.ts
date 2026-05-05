import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EntidadRemisionService } from '../services/entidad-remision.service';
import { CreateEntidadRemisionDto, UpdateEntidadRemisionDto } from '../dtos/entidad-remision.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Entidades de Remisión')
@Controller('entidades-remision')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class EntidadRemisionController {
  constructor(private readonly service: EntidadRemisionService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las entidades de remisión' })
  @ApiResponse({ status: 200, description: 'Lista de entidades de remisión' })
  findAll() {
    return this.service.findAll();
  }

  @Get('activas')
  @ApiOperation({ summary: 'Obtener solo entidades de remisión activas' })
  @ApiResponse({ status: 200, description: 'Lista de entidades activas' })
  findAllActivas() {
    return this.service.findAllActivas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una entidad de remisión por ID' })
  @ApiParam({ name: 'id', description: 'UUID de la entidad' })
  @ApiResponse({ status: 200, description: 'Entidad encontrada' })
  @ApiResponse({ status: 404, description: 'Entidad no encontrada' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva entidad de remisión' })
  @ApiResponse({ status: 201, description: 'Entidad creada exitosamente' })
  create(@Body() dto: CreateEntidadRemisionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una entidad de remisión' })
  @ApiParam({ name: 'id', description: 'UUID de la entidad' })
  @ApiResponse({ status: 200, description: 'Entidad actualizada' })
  @ApiResponse({ status: 404, description: 'Entidad no encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdateEntidadRemisionDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/toggle-activo')
  @ApiOperation({ summary: 'Activar/desactivar una entidad de remisión' })
  @ApiParam({ name: 'id', description: 'UUID de la entidad' })
  @ApiResponse({ status: 200, description: 'Estado cambiado' })
  @ApiResponse({ status: 404, description: 'Entidad no encontrada' })
  @HttpCode(HttpStatus.OK)
  toggleActivo(@Param('id') id: string, @Body('activo') activo: boolean) {
    return this.service.toggleActivo(id, activo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una entidad de remisión' })
  @ApiParam({ name: 'id', description: 'UUID de la entidad' })
  @ApiResponse({ status: 200, description: 'Entidad eliminada' })
  @ApiResponse({ status: 404, description: 'Entidad no encontrada' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Crear datos por defecto (seed)' })
  @ApiResponse({ status: 201, description: 'Datos种子 creados' })
  seed() {
    return this.service.seed();
  }
}
