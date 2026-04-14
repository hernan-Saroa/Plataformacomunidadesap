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
  async uploadPlantilla(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AutoConfiguration> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }
    
    // Construir la URL del archivo
    const fileUrl = `/uploads/plantillas-autos/${file.filename}`;
    
    // Actualizar la configuración con la URL de la plantilla
    return await this.autosConfigService.updatePlantilla(id, fileUrl);
  }
}
