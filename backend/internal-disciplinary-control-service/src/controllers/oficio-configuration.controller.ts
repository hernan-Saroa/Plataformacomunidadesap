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
import { OficiosConfigurationService } from '../services/oficio-configuration.service';
import {
  CreateOficioConfigurationDto,
  UpdateOficioConfigurationDto,
} from '../dtos/oficio-configuration.dto';
import { OficioConfiguration } from '../entities/oficio-configuration.entity';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

@ApiTags('Configuración de Oficios')
@Controller('oficios-configuration')
export class OficiosConfigurationController {
  constructor(
    private oficiosConfigService: OficiosConfigurationService,
  ) {}

  /**
   * Crear nueva configuración de oficio
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear configuración de oficio' })
  @ApiResponse({ status: 201, description: 'Configuración creada' })
  async create(
    @Body() createDto: CreateOficioConfigurationDto,
  ): Promise<OficioConfiguration> {
    return await this.oficiosConfigService.create(createDto);
  }

  /**
   * Obtener todas las configuraciones de oficios
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las configuraciones' })
  async findAll(): Promise<OficioConfiguration[]> {
    return await this.oficiosConfigService.findAll();
  }

  /**
   * Obtener solo los oficios activos
   */
  @Get('active')
  @ApiOperation({ summary: 'Listar configuraciones activas' })
  async findActive(): Promise<OficioConfiguration[]> {
    return await this.oficiosConfigService.findActive();
  }

  /**
   * Obtener configuraciones por etapa
   */
  @Get('stage/:stage')
  @ApiOperation({ summary: 'Listar configuraciones por etapa' })
  async findByStage(@Param('stage') stage: string): Promise<OficioConfiguration[]> {
    return await this.oficiosConfigService.findByStage(stage);
  }

  /**
   * Obtener una configuración por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener configuración por ID' })
  async findById(@Param('id') id: string): Promise<OficioConfiguration> {
    return await this.oficiosConfigService.findById(id);
  }

  /**
   * Obtener una configuración por tipo
   */
  @Get('tipo/:tipo')
  @ApiOperation({ summary: 'Obtener configuración por tipo' })
  async findByTipo(@Param('tipo') tipo: string): Promise<OficioConfiguration> {
    return await this.oficiosConfigService.findByTipo(tipo);
  }

  /**
   * Actualizar una configuración
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOficioConfigurationDto,
  ): Promise<OficioConfiguration> {
    return await this.oficiosConfigService.update(id, updateDto);
  }

  /**
   * Eliminar una configuración
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.oficiosConfigService.delete(id);
  }

  /**
   * Activar/desactivar una configuración
   */
  @Patch(':id/toggle-estado')
  @ApiOperation({ summary: 'Cambiar estado de configuración' })
  async toggleEstado(@Param('id') id: string): Promise<OficioConfiguration> {
    return await this.oficiosConfigService.toggleEstado(id);
  }

  /**
   * Subir plantilla Word para un oficio específico
   */
  @Post(':id/upload-files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subir plantilla Word para oficio' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'plantillas-oficios');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `plantilla-oficio-${req.params.id}-${uniqueSuffix}${ext}`;
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
    @Body() body: { nombre_plantilla?: string; descripcion_plantilla?: string; version_plantilla?: string; estado_plantilla?: string },
  ): Promise<OficioConfiguration> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }
    
    // Construir la URL del archivo
    const fileUrl = `/uploads/plantillas-oficios/${file.filename}`;
    
    // Actualizar la configuración con la URL de la plantilla y los campos adicionales
    return await this.oficiosConfigService.updatePlantilla(
      id, 
      fileUrl,
      body?.nombre_plantilla || file.originalname,
      body?.descripcion_plantilla || null,
      body?.version_plantilla || '1.0',
      body?.estado_plantilla || 'activo'
    );
  }
}
