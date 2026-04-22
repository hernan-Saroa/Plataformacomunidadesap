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
import { ActasConfigurationService } from '../services/acta-configuration.service';
import {
  CreateActaConfigurationDto,
  UpdateActaConfigurationDto,
} from '../dtos/acta-configuration.dto';
import { ActaConfiguration } from '../entities/acta-configuration.entity';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Configuración de Actas')
@Controller('actas-configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class ActasConfigurationController {
  constructor(
    private actasConfigService: ActasConfigurationService,
  ) {}

  /**
   * Crear nueva configuración de acta
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear configuración de acta' })
  @ApiResponse({ status: 201, description: 'Configuración creada' })
  async create(
    @Body() createDto: CreateActaConfigurationDto,
  ): Promise<ActaConfiguration> {
    return await this.actasConfigService.create(createDto);
  }

  /**
   * Obtener todas las configuraciones de actas
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las configuraciones' })
  async findAll(): Promise<ActaConfiguration[]> {
    return await this.actasConfigService.findAll();
  }

  /**
   * Obtener solo las actas activas
   */
  @Get('active')
  @ApiOperation({ summary: 'Listar configuraciones activas' })
  async findActive(): Promise<ActaConfiguration[]> {
    return await this.actasConfigService.findActive();
  }

  /**
   * Obtener configuraciones por etapa
   */
  @Get('stage/:stage')
  @ApiOperation({ summary: 'Listar configuraciones por etapa' })
  async findByStage(@Param('stage') stage: string): Promise<ActaConfiguration[]> {
    return await this.actasConfigService.findByStage(stage);
  }

  /**
   * Obtener una configuración por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener configuración por ID' })
  async findById(@Param('id') id: string): Promise<ActaConfiguration> {
    return await this.actasConfigService.findById(id);
  }

  /**
   * Obtener una configuración por tipo
   */
  @Get('tipo/:tipo')
  @ApiOperation({ summary: 'Obtener configuración por tipo' })
  async findByTipo(@Param('tipo') tipo: string): Promise<ActaConfiguration> {
    return await this.actasConfigService.findByTipo(tipo);
  }

  /**
   * Actualizar una configuración
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateActaConfigurationDto,
  ): Promise<ActaConfiguration> {
    return await this.actasConfigService.update(id, updateDto);
  }

  /**
   * Eliminar una configuración
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.actasConfigService.delete(id);
  }

  /**
   * Activar/desactivar una configuración
   */
  @Patch(':id/toggle-estado')
  @ApiOperation({ summary: 'Cambiar estado de configuración' })
  async toggleEstado(@Param('id') id: string): Promise<ActaConfiguration> {
    return await this.actasConfigService.toggleEstado(id);
  }

  /**
   * Subir plantilla Word para un acta específica
   */
  @Post(':id/upload-files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subir plantilla Word para acta' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'plantillas-actas');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `plantilla-acta-${req.params.id}-${uniqueSuffix}${ext}`;
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
  ): Promise<ActaConfiguration> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }
    
    // Construir la URL del archivo
    const fileUrl = `/uploads/plantillas-actas/${file.filename}`;
    
    // Actualizar la configuración con la URL de la plantilla y los campos adicionales
    return await this.actasConfigService.updatePlantilla(
      id, 
      fileUrl,
      body?.nombre_plantilla || file.originalname,
      body?.descripcion_plantilla || null,
      body?.version_plantilla || '1.0',
      body?.estado_plantilla || 'activo'
    );
  }
}
