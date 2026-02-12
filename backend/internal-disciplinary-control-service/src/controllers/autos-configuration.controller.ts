import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AutosConfigurationService } from '../services/autos-configuration.service';
import {
  CreateAutosConfigurationDto,
  UpdateAutosConfigurationDto,
} from '../dtos/autos-configuration.dto';
import { AutoConfiguration } from '../entities/auto-configuration.entity';

@ApiTags('Configuración de Autos')
@Controller('autos-configuration')
export class AutosConfigurationController {
  constructor(
    private autosConfigService: AutosConfigurationService,
  ) {}

  /**
   * Crear nueva configuración de auto
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear configuración de auto' })
  @ApiResponse({ status: 201, description: 'Configuración creada' })
  async create(
    @Body() createDto: CreateAutosConfigurationDto,
  ): Promise<AutoConfiguration> {
    return await this.autosConfigService.create(createDto);
  }

  /**
   * Obtener todas las configuraciones de autos
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las configuraciones' })
  async findAll(): Promise<AutoConfiguration[]> {
    return await this.autosConfigService.findAll();
  }

  /**
   * Obtener solo los autos activos
   */
  @Get('active')
  @ApiOperation({ summary: 'Listar configuraciones activas' })
  async findActive(): Promise<AutoConfiguration[]> {
    return await this.autosConfigService.findActive();
  }

  /**
   * Obtener una configuración por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener configuración por ID' })
  async findById(@Param('id') id: string): Promise<AutoConfiguration> {
    return await this.autosConfigService.findById(id);
  }

  /**
   * Obtener una configuración por tipo
   */
  @Get('tipo/:tipo')
  @ApiOperation({ summary: 'Obtener configuración por tipo' })
  async findByTipo(@Param('tipo') tipo: string): Promise<AutoConfiguration> {
    return await this.autosConfigService.findByTipo(tipo);
  }

  /**
   * Actualizar una configuración
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAutosConfigurationDto,
  ): Promise<AutoConfiguration> {
    return await this.autosConfigService.update(id, updateDto);
  }

  /**
   * Eliminar una configuración
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.autosConfigService.delete(id);
  }

  /**
   * Activar/desactivar una configuración
   */
  @Patch(':id/toggle-estado')
  @ApiOperation({ summary: 'Cambiar estado de configuración' })
  async toggleEstado(@Param('id') id: string): Promise<AutoConfiguration> {
    return await this.autosConfigService.toggleEstado(id);
  }
}
