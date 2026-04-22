import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReglasAlertaService } from '../services/reglas-alerta.service';
import {
  CreateReglaAlertaDto,
  UpdateReglaAlertaDto,
} from '../dtos/reglas-alerta.dto';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Reglas de Alerta')
@Controller('reglas-alerta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class ReglasAlertaController {
  constructor(
    private reglasService: ReglasAlertaService,
  ) {}

  /**
   * Listar todas las reglas de alerta
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar reglas de alerta',
    description: 'Retorna todas las reglas de alerta configuradas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reglas de alerta',
  })
  async listar() {
    return await this.reglasService.listar();
  }

  /**
   * Obtener regla por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener regla de alerta por ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Regla de alerta encontrada',
    type: ReglaAlerta,
  })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  async obtenerPorId(@Param('id') id: string) {
    return await this.reglasService.obtenerPorId(id);
  }

  /**
   * Crear nueva regla de alerta
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear regla de alerta',
    description: 'Crea una nueva regla de alerta configurable',
  })
  @ApiResponse({
    status: 201,
    description: 'Regla de alerta creada exitosamente',
    type: ReglaAlerta,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Nombre de regla duplicado' })
  async crear(
    @Body() dto: CreateReglaAlertaDto,
    @Request() req: any,
  ): Promise<ReglaAlerta> {
    // UUID del sistema cuando no hay usuario autenticado
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
    const creadoPorId = req.user?.id || SYSTEM_USER_ID;
    return await this.reglasService.crear(dto, creadoPorId);
  }

  /**
   * Actualizar regla de alerta
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar regla de alerta',
  })
  @ApiResponse({
    status: 200,
    description: 'Regla de alerta actualizada',
    type: ReglaAlerta,
  })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre de regla duplicado' })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateReglaAlertaDto,
  ): Promise<ReglaAlerta> {
    return await this.reglasService.actualizar(id, dto);
  }

  /**
   * Activar/desactivar regla
   */
  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activar/desactivar regla de alerta',
    description: 'Cambia el estado activo/inactivo de una regla',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de regla actualizado',
    type: ReglaAlerta,
  })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  async toggle(@Param('id') id: string): Promise<ReglaAlerta> {
    return await this.reglasService.toggle(id);
  }

  /**
   * Eliminar regla de alerta
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar regla de alerta',
    description: 'Elimina una regla de alerta (solo si no tiene alertas asociadas)',
  })
  @ApiResponse({ status: 204, description: 'Regla eliminada' })
  @ApiResponse({ status: 400, description: 'Regla tiene alertas asociadas' })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.reglasService.eliminar(id);
  }
}

