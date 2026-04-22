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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AutosConfigurationService } from '../services/autos-configuration.service';
import {
  AutoConfigurationDeletionImpactDto,
  CreateAutosConfigurationDto,
  UpdateAutosConfigurationDto,
} from '../dtos/autos-configuration.dto';
import { AutoConfiguration } from '../entities/auto-configuration.entity';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Configuración de Autos')
@Controller('autos-configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
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
  @ApiResponse({ status: 201, description: 'Configuración creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Ya existe una configuración para este tipo' })
  async create(
    @Body() createDto: CreateAutosConfigurationDto,
  ): Promise<{ success: boolean; message: string; data?: AutoConfiguration }> {
    try {
      const autoConfig = await this.autosConfigService.create(createDto);
      return {
        success: true,
        message: 'Configuración de auto creada exitosamente',
        data: autoConfig,
      };
    } catch (error) {
      // Re-throw to maintain HTTP status codes
      throw error;
    }
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
   * Obtener impacto de eliminación de una configuración
   */
  @Get(':id/deletion-impact')
  @ApiOperation({
    summary:
      'Consultar procesos asociados antes de eliminar una configuración de auto',
  })
  @ApiResponse({
    status: 200,
    description: 'Impacto de eliminación calculado correctamente',
    type: AutoConfigurationDeletionImpactDto,
  })
  async getDeletionImpact(
    @Param('id') id: string,
  ): Promise<AutoConfigurationDeletionImpactDto> {
    return await this.autosConfigService.getDeletionImpact(id);
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
  async findByTipo(@Param('tipo') tipo: string): Promise<AutoConfiguration | null> {
    return await this.autosConfigService.findByTipo(tipo);
  }

  /**
   * Actualizar una configuración
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una configuración para este tipo' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAutosConfigurationDto,
  ): Promise<{ success: boolean; message: string; data?: AutoConfiguration }> {
    try {
      const autoConfig = await this.autosConfigService.update(id, updateDto);
      return {
        success: true,
        message: 'Configuración de auto actualizada exitosamente',
        data: autoConfig,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar una configuración
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar configuración' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar porque tiene procesos asociados' })
  async delete(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.autosConfigService.delete(id);
      return {
        success: true,
        message: 'Configuración de auto eliminada exitosamente',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Activar/desactivar una configuración
   */
  @Patch(':id/toggle-estado')
  @ApiOperation({ summary: 'Cambiar estado de configuración' })
  @ApiResponse({ status: 200, description: 'Estado de configuración actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async toggleEstado(@Param('id') id: string): Promise<{ success: boolean; message: string; data?: AutoConfiguration }> {
    try {
      const autoConfig = await this.autosConfigService.toggleEstado(id);
      const nuevoEstado = autoConfig.estado === 'activo' ? 'activada' : 'desactivada';
      return {
        success: true,
        message: `Configuración de auto ${nuevoEstado} exitosamente`,
        data: autoConfig,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subir plantilla Word para un auto específico
   */
  @Post(':id/upload-files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subir plantilla Word para auto' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'plantillas-autos');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `plantilla-auto-${req.params.id}-${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.docx', '.doc', '.dotx', '.rtf'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos Word (.docx, .doc, .dotx, .rtf)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @ApiResponse({ status: 200, description: 'Plantilla subida exitosamente' })
  @ApiResponse({ status: 400, description: 'No se ha subido ningún archivo' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async uploadPlantilla(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; message: string; data?: AutoConfiguration }> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }

    try {
      // Construir la URL del archivo
      const fileUrl = `/uploads/plantillas-autos/${file.filename}`;

      // Actualizar la configuración con la URL de la plantilla
      const autoConfig = await this.autosConfigService.updatePlantilla(id, fileUrl);
      return {
        success: true,
        message: 'Plantilla subida exitosamente',
        data: autoConfig,
      };
    } catch (error) {
      throw error;
    }
  }
}
