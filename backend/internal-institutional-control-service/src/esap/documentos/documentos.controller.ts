import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';

// Tipo para el archivo subido
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
import { DocumentosService } from './documentos.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { EtapaDocumento } from './entities/documento.entity';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  /**
   * GET /documentos
   * Lista todos los documentos con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  findAll(
    @Query('auditoriaId') auditoriaId?: string,
    @Query('hallazgoId') hallazgoId?: string,
    @Query('planMejoramientoId') planMejoramientoId?: string,
    @Query('tipoDocumento') tipoDocumento?: string,
    @Query('etapa') etapa?: string,
    @Query('search') search?: string,
    @Query('planAnualVigencia') planAnualVigencia?: string,
    @Query('planAnualId') planAnualId?: string,
    @Query('bibliotecaOnly') bibliotecaOnly?: string,
  ) {
    const vigenciaNum =
      planAnualVigencia != null && planAnualVigencia !== ''
        ? parseInt(planAnualVigencia, 10)
        : undefined;
    return this.documentosService.findAll({
      auditoriaId,
      hallazgoId,
      planMejoramientoId,
      tipoDocumento,
      etapa,
      search,
      planAnualId,
      planAnualVigencia: Number.isNaN(vigenciaNum) ? undefined : vigenciaNum,
      bibliotecaOnly: bibliotecaOnly === 'true',
    });
  }

  /**
   * GET /documentos/plantillas-requeridas?etapa=planeacion&auditoriaId=xxx
   * Plantillas de biblioteca aplicables a esta auditoría en la etapa (para validar cantidad a subir).
   */
  @Get('plantillas-requeridas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  getPlantillasRequeridas(
    @Query('etapa') etapa: string,
    @Query('auditoriaId') auditoriaId: string,
  ) {
    if (!etapa || !auditoriaId) {
      throw new BadRequestException('etapa y auditoriaId son requeridos');
    }
    return this.documentosService.findPlantillasRequeridasPorEtapa(etapa, auditoriaId);
  }

  /**
   * GET /documentos/auditoria/:auditoriaId
   * Obtiene todos los documentos de una auditoría
   * (Debe ir ANTES de :id para que no capture "auditoria" como id)
   */
  @Get('auditoria/:auditoriaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  getDocumentosPorAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.documentosService.findAll({ auditoriaId });
  }

  /**
   * GET /documentos/auditoria/:auditoriaId/etapa/:etapa
   * Obtiene documentos por auditoría y etapa
   */
  @Get('auditoria/:auditoriaId/etapa/:etapa')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  getDocumentosPorEtapa(
    @Param('auditoriaId') auditoriaId: string,
    @Param('etapa') etapa: EtapaDocumento,
  ) {
    return this.documentosService.getDocumentosPorEtapa(auditoriaId, etapa);
  }

  /**
   * GET /documentos/:id
   * Obtiene un documento por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  findOne(@Param('id') id: string) {
    return this.documentosService.findOne(id);
  }

  /**
   * POST /documentos
   * Crea un nuevo documento (sube archivo y crea registro)
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_CREATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/control-interno';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB máximo
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @UploadedFile() file: MulterFile,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // 🔍 DEBUG: Ver qué llega del frontend
    console.log('🔍 [BACKEND CREATE DOC] ===== BODY RECIBIDO =====');
    console.log('🔍 [BACKEND CREATE DOC] body completo:', JSON.stringify(body, null, 2));
    console.log('🔍 [BACKEND CREATE DOC] etapaKanbanId RAW:', body.etapaKanbanId, 'tipo:', typeof body.etapaKanbanId);
    console.log('🔍 [BACKEND CREATE DOC] etapaNombreKanban RAW:', body.etapaNombreKanban, 'tipo:', typeof body.etapaNombreKanban);

    // Parsear campos del body (vienen como strings en multipart/form-data)
    const createDto: CreateDocumentoDto = {
      nombre: body.nombre || file.originalname,
      descripcion: body.descripcion,
      tipoDocumento: body.tipoDocumento as any,
      etapa: body.etapa as any,
      etapaKanbanId: body.etapaKanbanId || undefined,
      etapaNombreKanban: body.etapaNombreKanban || undefined,
      auditoriaId: body.auditoriaId || undefined,
      hallazgoId: body.hallazgoId || undefined,
      planMejoramientoId: body.planMejoramientoId || undefined,
      documentoBibliotecaId: body.documentoBibliotecaId || undefined,
      visibleAuditoriaId: body.visibleAuditoriaId || undefined,
      planAnualVigencia: body.planAnualVigencia
        ? parseInt(body.planAnualVigencia, 10)
        : undefined,
      planAnualId: body.planAnualId || undefined,
      nombreArchivo: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      subidoPor: body.subidoPor || 'Sistema',
      hashArchivo: undefined, // Se calculará en el servicio
    };

    console.log('🔍 [BACKEND CREATE DOC] CreateDTO construido:', {
      etapaKanbanId: createDto.etapaKanbanId,
      etapaNombreKanban: createDto.etapaNombreKanban
    });

    // Generar ruta final del archivo
    const rutaFinal = this.documentosService.generarRutaArchivo(
      file.originalname,
      createDto.auditoriaId,
      createDto.etapa,
    );

    // Mover archivo a la ruta final
    const path = require('path');
    const dir = path.dirname(rutaFinal);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    renameSync(file.path, rutaFinal);

    return this.documentosService.create(createDto, rutaFinal);
  }

  /**
   * PUT /documentos/:id
   * Actualiza un documento existente
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateDocumentoDto) {
    return this.documentosService.update(id, updateDto);
  }

  /**
   * DELETE /documentos/:id
   * Elimina un documento
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.documentosService.delete(id);
  }

  /**
   * GET /documentos/:id/download
   * Descarga un documento (público para iframes/descargas directas)
   */
  @Get(':id/download')
  @Public()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  async download(@Param('id') id: string, @Res() res: Response) {
    const documento = await this.documentosService.findOne(id);
    const path = require('path');

    if (!existsSync(documento.rutaArchivo)) {
      throw new BadRequestException('El archivo no existe en el servidor');
    }

    // Codificar el nombre del archivo para UTF-8 (RFC 5987)
    const encodedFilename = encodeURIComponent(documento.nombreArchivo);
    const filenameStar = `filename*=UTF-8''${encodedFilename}`;
    
    res.setHeader('Content-Type', `${documento.tipoMime}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="${documento.nombreArchivo}"; ${filenameStar}`);
    res.setHeader('Content-Length', documento.tamanioBytes.toString());

    return res.sendFile(path.resolve(documento.rutaArchivo));
  }

  /**
   * GET /documentos/:id/preview
   * Previsualiza un documento (si es imagen o PDF). Público para iframes.
   */
  @Get(':id/preview')
  @Public()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  async preview(@Param('id') id: string, @Res() res: Response) {
    const documento = await this.documentosService.findOne(id);
    const path = require('path');

    if (!existsSync(documento.rutaArchivo)) {
      throw new BadRequestException('El archivo no existe en el servidor');
    }

    // Solo permitir preview de imágenes y PDFs
    const tiposPreview = ['image/', 'application/pdf'];
    if (!tiposPreview.some(tipo => documento.tipoMime.startsWith(tipo))) {
      throw new BadRequestException('Este tipo de archivo no se puede previsualizar');
    }

    // Codificar el nombre del archivo para UTF-8 (RFC 5987)
    const encodedFilename = encodeURIComponent(documento.nombreArchivo);
    const filenameStar = `filename*=UTF-8''${encodedFilename}`;
    
    res.setHeader('Content-Type', `${documento.tipoMime}; charset=utf-8`);
    res.setHeader('Content-Disposition', `inline; filename="${documento.nombreArchivo}"; ${filenameStar}`);

    return res.sendFile(path.resolve(documento.rutaArchivo));
  }

  /**
   * GET /documentos/:id/versiones
   * Obtiene el historial de versiones de un documento
   */
  @Get(':id/versiones')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_VIEW)
  getHistorialVersiones(@Param('id') id: string) {
    return this.documentosService.getHistorialVersiones(id);
  }

  /**
   * POST /documentos/:id/sincronizar
   * Marca un documento como sincronizado con servidor G:
   */
  @Post(':id/sincronizar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.DOCUMENTO_EDIT)
  marcarSincronizado(
    @Param('id') id: string,
    @Body() body: { rutaServidorG: string },
  ) {
    return this.documentosService.marcarSincronizado(id, body.rutaServidorG);
  }
}

