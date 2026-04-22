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
import { TipoRemisionService } from '../services/tipo-remision.service';
import {
  CreateTipoRemisionDto,
  UpdateTipoRemisionDto,
} from '../dtos/tipo-remision.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Tipos de Remisión')
@Controller('tipos-remision')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class TipoRemisionController {
  constructor(private readonly service: TipoRemisionService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos de remisión' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de remisión' })
  findAll() {
    return this.service.findAll();
  }

  @Get('activas')
  @ApiOperation({ summary: 'Obtener solo tipos de remisión activos' })
  @ApiResponse({ status: 200, description: 'Lista de tipos activos' })
  findAllActivas() {
    return this.service.findAllActivas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de remisión por ID' })
  @ApiParam({ name: 'id', description: 'UUID del tipo' })
  @ApiResponse({ status: 200, description: 'Tipo encontrado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo tipo de remisión' })
  @ApiResponse({ status: 201, description: 'Tipo creado exitosamente' })
  create(@Body() dto: CreateTipoRemisionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un tipo de remisión' })
  @ApiParam({ name: 'id', description: 'UUID del tipo' })
  @ApiResponse({ status: 200, description: 'Tipo actualizado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateTipoRemisionDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/toggle-activo')
  @ApiOperation({ summary: 'Activar/desactivar un tipo de remisión' })
  @ApiParam({ name: 'id', description: 'UUID del tipo' })
  @ApiResponse({ status: 200, description: 'Estado cambiado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  @HttpCode(HttpStatus.OK)
  toggleActivo(@Param('id') id: string, @Body('activo') activo: boolean) {
    return this.service.toggleActivo(id, activo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un tipo de remisión' })
  @ApiParam({ name: 'id', description: 'UUID del tipo' })
  @ApiResponse({ status: 200, description: 'Tipo eliminado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Crear datos por defecto (seed)' })
  @ApiResponse({ status: 201, description: 'Datos seed creados' })
  seed() {
    return this.service.seed();
  }
}
