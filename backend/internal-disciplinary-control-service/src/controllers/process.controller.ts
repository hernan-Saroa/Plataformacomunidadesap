import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpException,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProcessService } from '../services/process.service';
import { NewsService } from '../services/news.service';
import { AutoService } from '../services/auto.service';
import {
  CreateDisciplinaryProcessDto,
  DisciplinaryProcessResponseDto,
} from '../dtos/create-disciplinary-process.dto';
import { ChangeStageDto } from '../dtos/change-stage.dto';
import { UpdateDisciplinaryProcessDto } from '../dtos/update-disciplinary-process.dto';
import { RemitirPorCompetenciaDto, RemisionPorCompetenciaResponseDto } from '../dtos/remitir-competencia.dto';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import {
  DEFAULT_UPLOAD_DIR,
  StorageService,
  buildStoredFileName,
  ensureUploadDirExists,
} from '../services/storage.service';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { diskStorage, MulterError } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';
import { PermissionsService } from '../auth/services/permissions.service';
import JSZip from 'jszip';

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024 * 1024;
const MAX_STANDARD_DOCUMENT_SIZE = 50 * 1024 * 1024;
const DISCIPLINARY_FULL_PROCESS_ACCESS_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CONTROL_DISCIPLINARIO',
  'JEFE_OCID',
  'JEFE_DE_LA_OCID',
]);

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    email?: string;
    roles?: unknown;
  };
};

const PROCESS_DOCUMENT_UPLOAD_OPTIONS = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      try {
        const uploadDir = path.resolve(process.cwd(), ensureUploadDirExists(DEFAULT_UPLOAD_DIR));
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, path.resolve(process.cwd(), DEFAULT_UPLOAD_DIR));
      }
    },
    filename: (_req, file, cb) => {
      cb(null, buildStoredFileName(file.originalname));
    },
  }),
  limits: {
    fileSize: MAX_EVIDENCE_FILE_SIZE,
  },
};

@ApiTags('Procesos Disciplinarios')
@Controller('disciplinary-processes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class ProcessController {
  constructor(
    private processService: ProcessService,
    private newsService: NewsService,
    private storageService: StorageService,
    private autoService: AutoService,
    private httpService: HttpService,
    private permissionsService: PermissionsService,
  ) { }

  private normalizeRoleCode(role: unknown): string | null {
    if (typeof role === 'string') {
      const normalized = role.trim().toUpperCase();
      return normalized || null;
    }

    if (role && typeof role === 'object' && 'code' in role) {
      const code = (role as { code?: unknown }).code;
      if (typeof code === 'string') {
        const normalized = code.trim().toUpperCase();
        return normalized || null;
      }
    }

    return null;
  }

  private extractNormalizedRoles(req: AuthenticatedRequest): Set<string> {
    const source = req.user?.roles;
    const roles = Array.isArray(source) ? source : source ? [source] : [];

    return new Set(
      roles
        .map((role) => this.normalizeRoleCode(role))
        .filter((role): role is string => Boolean(role)),
    );
  }

  private hasFullSensitiveAccess(req: AuthenticatedRequest): boolean {
    const normalizedRoles = this.extractNormalizedRoles(req);

    for (const role of normalizedRoles) {
      if (DISCIPLINARY_FULL_PROCESS_ACCESS_ROLES.has(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica si el usuario tiene el permiso granular que permite ver TODOS los expedientes
   * (CONTROL_DISCIPLINARIO_EXPEDIENTE_ELECTRONICO_VIEW_ALL).
   * Consulta real contra la tabla auth.permission usando los roles del token.
   */
  private async hasExpedienteViewAllPermission(req: AuthenticatedRequest): Promise<boolean> {
    const normalizedRoles = Array.from(this.extractNormalizedRoles(req));
    if (normalizedRoles.length === 0) return false;

    // Fast path para super admins (ya cubierto por roles legacy, pero por si acaso)
    if (normalizedRoles.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r))) {
      return true;
    }

    const userPermissions = await this.permissionsService.getPermissionsByRoles(normalizedRoles);

    return userPermissions.some(perm =>
      perm === 'control-disciplinario.expediente-electronico.view_all' ||
      perm.endsWith('expediente-electronico.view_all'),
    );
  }

  private async getSensitiveAccessContext(req: AuthenticatedRequest): Promise<{
    fullAccess: boolean;
    canViewAllExpedientes: boolean;
    userId?: string;
    email?: string;
  }> {
    const legacyFullAccess = this.hasFullSensitiveAccess(req);
    const canViewAll = legacyFullAccess || await this.hasExpedienteViewAllPermission(req);

    return {
      fullAccess: legacyFullAccess || canViewAll,
      canViewAllExpedientes: canViewAll,
      userId: req.user?.userId,
      email: req.user?.email,
    };
  }

  private async ensureSensitiveProcessAccess(
    req: AuthenticatedRequest,
    processId: string,
    includeAutos = false,
  ): Promise<void> {
    const access = await this.getSensitiveAccessContext(req);

    if (access.fullAccess) {
      return;
    }

    await this.processService.findByIdAccessible(
      processId,
      includeAutos,
      access.userId,
      access.email,
    );
  }

  /**
   * Obtener estadísticas para el dashboard
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas del dashboard',
    description: 'Retorna estadísticas de procesos activos, próximos a vencer, vencidos y profesionales',
  })
  async getStats() {
    return await this.processService.getStats();
  }

  /**
   * Obtener estadísticas dinámicas de un proceso específico
   */
  @Get(':id/statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas del proceso',
    description: 'Retorna las estadísticas dinámicas del proceso: borradores, documentos y porcentaje de tiempo',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del proceso',
  })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async getProcessStatistics(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const access = await this.getSensitiveAccessContext(req);

    if (access.fullAccess) {
      return await this.processService.getProcessStatistics(id);
    }

    return await this.processService.getProcessStatisticsAccessible(
      id,
      access.userId,
      access.email,
    );
  }

  /**
   * H2: Asignar un profesional a una noticia (crear proceso)
   */
  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Asignar Profesional',
    description:
      'El Jefe asigna una noticia a un abogado, creando el proceso disciplinario',
  })
  @ApiResponse({
    status: 201,
    description: 'Proceso creado exitosamente',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 400, description: 'Noticia inválida o ya asignada' })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async assign(
    @Body() createProcessDto: CreateDisciplinaryProcessDto,
  ): Promise<DisciplinaryProcess> {
    return await this.processService.create(createProcessDto);
  }

  /**
   * Actualizar datos generales del proceso
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar Procesos',
    description: 'Actualiza datos del proceso como el abogado asignado, hechos y datos del disciplinable',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso actualizado',
    type: DisciplinaryProcess,
  })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryProcessDto,
  ): Promise<DisciplinaryProcess> {
    await this.ensureSensitiveProcessAccess(req, id);
    return await this.processService.update(id, updateDto);
  }

  /**
   * Obtener proceso por radicado de proceso (radicadoProceso)
   */
  @Get('by-radicado/:radicado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener proceso por radicado',
    description: 'Busca un proceso por su radicadoProceso (ej: P-123-2025)',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso encontrado',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async getByRadicado(
    @Req() req: AuthenticatedRequest,
    @Param('radicado') radicado: string,
  ): Promise<DisciplinaryProcess> {
    const access = await this.getSensitiveAccessContext(req);

    if (access.fullAccess) {
      return await this.processService.findByRadicado(radicado);
    }

    return await this.processService.findByRadicadoAccessible(
      radicado,
      access.userId,
      access.email,
    );
  }

  /**
   * H3, H7: Cambiar etapa del proceso
   */
  @Patch(':id/stage')
  @ApiOperation({
    summary: 'Cambiar Etapa del Proceso',
    description: 'El abogado avanza el proceso a la siguiente etapa',
  })
  @ApiResponse({
    status: 200,
    description: 'Etapa actualizada',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 400, description: 'Transición de etapa no permitida' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async updateStage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() changeStageDto: ChangeStageDto,
  ): Promise<DisciplinaryProcess> {
    await this.ensureSensitiveProcessAccess(req, id);
    return await this.processService.changeStage(
      id,
      changeStageDto.stageId,
      changeStageDto.kanbanNotice
    );
  }

  /**
   * Agregar evidencia al proceso (vía URL)
   */
  @Patch(':id/evidence')
  @ApiOperation({
    summary: 'Agregar Evidencia',
    description: 'Agrega una URL de evidencia al proceso',
  })
  @ApiResponse({
    status: 200,
    description: 'Evidencia agregada',
    type: DisciplinaryProcess,
  })
  async addEvidence(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { url: string; originalName: string },
  ): Promise<DisciplinaryProcess> {
    await this.ensureSensitiveProcessAccess(req, id);
    return await this.processService.addEvidence(id, body.url, body.originalName);
  }

  /**
   * Subir documento al expediente del proceso
   */
  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', PROCESS_DOCUMENT_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir documento',
    description: 'Sube un documento al expediente del proceso disciplinario. Puede ser un archivo o una URL externa.',
  })
  @ApiResponse({
    status: 201,
    description: 'Documento subido exitosamente',
  })
  async uploadDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { tipo?: string; descripcion?: string; nombre?: string; etapa?: string; usuarioCarga?: string; categoria?: string; destinatario?: string; asunto?: string; participantes?: string; urlExterna?: string },
  ) {
    let metadataSaved = false;
    try {
      await this.ensureSensitiveProcessAccess(req, id);
      console.log('📤 Upload Document - Iniciando...');
      console.log('📤 Body recibido:', JSON.stringify(body, null, 2));
      console.log('📤 Archivo:', file ? `${file.originalname}, ${file.size} bytes` : 'No hay archivo');
      console.log('📤 URL Externa:', body.urlExterna || 'No hay URL externa');

      // Validar que haya archivo o URL externa
      if (!file && !body.urlExterna) {
        throw new HttpException(
          'Debe proporcionar un archivo o una URL externa',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validar tamaño del archivo si se proporciona (10GB para evidencias, 50MB para otros)
      if (file) {
        const isEvidencia = body.tipo?.toUpperCase() === 'EVIDENCIA';
        const maxSize = isEvidencia ? MAX_EVIDENCE_FILE_SIZE : MAX_STANDARD_DOCUMENT_SIZE;
        
        if (file.size > maxSize) {
          await this.removeUploadedFile(file);
          throw new HttpException(
            `El archivo excede el tamaño máximo permitido de ${isEvidencia ? '10GB' : '50MB'}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Obtener proceso para usar su radicado (sin cargar autos para evitar errores)
      const proceso = await this.processService.findById(id, false);
      console.log('✅ Proceso encontrado:', proceso.radicadoProceso);

      let tipoDocumento = body.tipo || 'DOCUMENTO';
      let rutaRelativa: string;
      let nombreDocumento: string;
      let fileType: string;
      let fileSize: number;
      let originalName: string;

      // Si hay URL externa, usar esa URL directamente
      if (body.urlExterna) {
        rutaRelativa = body.urlExterna;
        nombreDocumento = body.nombre || 'Documento Externo';
        originalName = body.nombre || 'Documento Externo';
        fileType = 'application/octet-stream'; // Tipo genérico para URLs externas
        fileSize = 0; // No conocemos el tamaño de URLs externas
        console.log('✅ Usando URL externa:', rutaRelativa);
      } else {
        // Validar archivo si no hay URL externa
        if (!file) {
          throw new HttpException(
            'Archivo requerido cuando no se proporciona URL externa',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (tipoDocumento === 'OFICIO' && file.mimetype !== 'application/pdf') {
          await this.removeUploadedFile(file);
          throw new HttpException(
            'Solo se permiten archivos PDF para oficios',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Validar tipo de archivo según el tipo de documento
        const allowedMimeTypes = this.getAllowedMimeTypes(tipoDocumento);
        if (!allowedMimeTypes.includes(file.mimetype)) {
          const allowedExtensions = this.getAllowedExtensions(tipoDocumento);
          await this.removeUploadedFile(file);
          throw new HttpException(
            `Tipo de archivo no permitido para "${tipoDocumento}". Solo se permiten: ${allowedExtensions}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Validar extensión del archivo como respaldo adicional
        const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
        const allowedExtensionsList = this.getAllowedExtensionsList(tipoDocumento);
        if (!allowedExtensionsList.includes(fileExtension)) {
          await this.removeUploadedFile(file);
          throw new HttpException(
            `Extensión de archivo no permitida para "${tipoDocumento}". Solo se permiten: ${allowedExtensionsList.join(', ')}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        rutaRelativa = file.filename;
        console.log('✅ Archivo guardado en:', rutaRelativa);

        nombreDocumento = body.nombre || file.originalname;
        originalName = file.originalname;
        fileType = file.mimetype;
        fileSize = file.size;
      }

      // Extraer información del body
      let etapa = body.etapa || null;
      let descripcionFinal = body.descripcion || '';
      const participantes = body.participantes ? Number(body.participantes) : undefined;

      console.log('📋 Datos a guardar:', {
        nombreDocumento,
        tipoDocumento,
        etapa,
        descripcionFinal,
        usuarioCarga: body.usuarioCarga || 'Sistema',
        categoria: body.categoria || null,
        destinatario: body.destinatario || null,
        asunto: body.asunto || null,
        participantes: participantes ?? null,
        urlExterna: body.urlExterna || null,
      });

      // Guardar en BD usando el método addEvidence con toda la información
      const procesoActualizado = await this.processService.addEvidence(
        id,
        rutaRelativa,
        originalName,
        descripcionFinal || nombreDocumento,
        fileType,
        fileSize,
        nombreDocumento,
        tipoDocumento,
        etapa || undefined,
        body.usuarioCarga || 'Sistema',
        body.categoria || undefined,
        body.destinatario || undefined,
        body.asunto || undefined,
        participantes,
      );
      console.log('✅ Documento guardado en BD exitosamente');

      metadataSaved = true;

      return {
        message: 'Documento subido exitosamente',
        url: rutaRelativa,
        filename: originalName,
        fileType: fileType,
        fileSize: fileSize,
        urlExterna: body.urlExterna || null,
        process: {
          id: procesoActualizado.id,
          radicadoProceso: procesoActualizado.radicadoProceso,
        },
      };
    } catch (error) {
      console.error('❌ ERROR al subir documento:', error);
      console.error('❌ Stack:', error.stack);
      if (error instanceof MulterError) {
        await this.removeUploadedFile(file);
        throw new HttpException(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'El archivo excede el tamano maximo permitido de 10GB'
            : error.message,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!metadataSaved) {
        await this.removeUploadedFile(file);
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al subir documento: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          throw new HttpException(
            'El archivo excede el tamaÃ±o mÃ¡ximo permitido de 10GB',
            HttpStatus.BAD_REQUEST,
          );
        }
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      console.error('âŒ Stack:', error.stack);
      throw new HttpException(
        `Error al subir documento: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los tipos MIME permitidos según el tipo de documento
   */
  private getAllowedMimeTypes(tipoDocumento: string): string[] {
    // Normalizar el tipo a mayúsculas y eliminar acentos
    const tipoNormalizado = tipoDocumento?.toUpperCase() || '';
    const tipoSinAcentos = tipoNormalizado
      .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
    
    const tiposPermitidos: Record<string, string[]> = {
      // Evidencias: HTML, PDF, Word, Excel, Imágenes, Videos
      'EVIDENCIA': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/html',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/heic',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
      ],
      // Evidencia alternativa
      'PRUEBA DOCUMENTAL': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/html',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/heic',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
      ],
      // Auto: Solo WORD
      'AUTO': [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      // Oficio: Solo PDF
      'OFICIO': [
        'application/pdf',
      ],
      // Notificación: PDF, Word, Excel
      'NOTIFICACION': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      // Acta: PDF, Word, Excel
      'ACTA': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      // Declaración: PDF, Word, Excel
      'DECLARACION': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      // Otros: PDF, Word, Excel
      'default': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    };

    // Mapear tipos del frontend a los tipos de validación
    if (tipoSinAcentos === 'EVIDENCIA' || tipoSinAcentos === 'PRUEBA DOCUMENTAL') {
      return tiposPermitidos['EVIDENCIA'];
    }
    if (tipoSinAcentos === 'AUTO') {
      return tiposPermitidos['AUTO'];
    }
    if (tipoSinAcentos === 'OFICIO') {
      return tiposPermitidos['OFICIO'];
    }
    if (tipoSinAcentos === 'NOTIFICACION' || tipoSinAcentos === 'NOTIFICACIÓN') {
      return tiposPermitidos['NOTIFICACION'];
    }
    if (tipoSinAcentos === 'ACTA') {
      return tiposPermitidos['ACTA'];
    }
    if (tipoSinAcentos === 'DECLARACION' || tipoSinAcentos === 'DECLARACIÓN') {
      return tiposPermitidos['DECLARACION'];
    }
    
    return tiposPermitidos['default'];
  }

  /**
   * Obtiene las extensiones permitidas según el tipo de documento
   */
  private getAllowedExtensions(tipoDocumento: string): string {
    // Normalizar el tipo
    const tipoNormalizado = tipoDocumento?.toUpperCase() || '';
    const tipoSinAcentos = tipoNormalizado
      .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');

    if (tipoSinAcentos === 'EVIDENCIA' || tipoSinAcentos === 'PRUEBA DOCUMENTAL') {
      return 'PDF, Word, Excel, HTML, Imagenes (JPG, PNG, GIF, WebP, HEIC), Videos (MP4, WebM, MOV, AVI), Audios (MP3, WAV, OGG)';
    }

    const extensiones: Record<string, string> = {
      'EVIDENCIA': 'PDF, Word, Excel, HTML, Imágenes (JPG, PNG, GIF, WebP), Videos (MP4, WebM, MOV, AVI)',
      'PRUEBA DOCUMENTAL': 'PDF, Word, Excel, HTML, Imágenes (JPG, PNG, GIF, WebP), Videos (MP4, WebM, MOV, AVI)',
      'AUTO': 'Solo PDF',
      'OFICIO': 'Solo PDF',
      'NOTIFICACION': 'PDF, Word, Excel',
      'NOTIFICACIÓN': 'PDF, Word, Excel',
      'ACTA': 'PDF, Word, Excel',
      'DECLARACION': 'PDF, Word, Excel',
      'DECLARACIÓN': 'PDF, Word, Excel',
      'default': 'PDF, Word, Excel',
    };

    if (tipoSinAcentos === 'EVIDENCIA' || tipoSinAcentos === 'PRUEBA DOCUMENTAL') {
      return extensiones['EVIDENCIA'];
    }
    if (tipoSinAcentos === 'AUTO') {
      return extensiones['AUTO'];
    }
    if (tipoSinAcentos === 'OFICIO') {
      return extensiones['OFICIO'];
    }
    if (tipoSinAcentos === 'NOTIFICACION' || tipoSinAcentos === 'NOTIFICACIÓN') {
      return extensiones['NOTIFICACION'];
    }
    if (tipoSinAcentos === 'ACTA') {
      return extensiones['ACTA'];
    }
    if (tipoSinAcentos === 'DECLARACION' || tipoSinAcentos === 'DECLARACIÓN') {
      return extensiones['DECLARACION'];
    }
    
    return extensiones['default'];
  }

  /**
   * Obtiene la lista de extensiones permitidas como array
   */
  private getAllowedExtensionsList(tipoDocumento: string): string[] {
    const tipoNormalizado = tipoDocumento?.toUpperCase() || '';
    const tipoSinAcentos = tipoNormalizado
      .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');

    if (tipoSinAcentos === 'EVIDENCIA' || tipoSinAcentos === 'PRUEBA DOCUMENTAL') {
      return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.html', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.mp4', '.webm', '.mov', '.avi', '.mp3', '.wav', '.ogg'];
    }

    const extensionesLista: Record<string, string[]> = {
      'EVIDENCIA': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.html', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi'],
      'PRUEBA DOCUMENTAL': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.html', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi'],
      'AUTO': ['.doc', '.docx'],
      'OFICIO': ['.pdf'],
      'NOTIFICACION': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
      'NOTIFICACIÓN': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
      'ACTA': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
      'DECLARACION': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
      'DECLARACIÓN': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
      'default': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    };

    if (tipoSinAcentos === 'EVIDENCIA' || tipoSinAcentos === 'PRUEBA DOCUMENTAL') {
      return extensionesLista['EVIDENCIA'];
    }
    if (tipoSinAcentos === 'AUTO') {
      return extensionesLista['AUTO'];
    }
    if (tipoSinAcentos === 'OFICIO') {
      return extensionesLista['OFICIO'];
    }
    if (tipoSinAcentos === 'NOTIFICACION' || tipoSinAcentos === 'NOTIFICACIÓN') {
      return extensionesLista['NOTIFICACION'];
    }
    if (tipoSinAcentos === 'ACTA') {
      return extensionesLista['ACTA'];
    }
    if (tipoSinAcentos === 'DECLARACION' || tipoSinAcentos === 'DECLARACIÓN') {
      return extensionesLista['DECLARACION'];
    }
    
    return extensionesLista['default'];
  }

  private async removeUploadedFile(file?: Express.Multer.File): Promise<void> {
    if (!file?.path) {
      return;
    }

    try {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
    } catch (cleanupError) {
      console.error('[ProcessController] No fue posible limpiar archivo temporal:', cleanupError);
    }
  }

  /**
   * Listar documentos del proceso
   */
  @Get(':id/documents')
  @ApiOperation({
    summary: 'Listar documentos',
    description: 'Obtiene todos los documentos del expediente del proceso',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos',
  })
  async getDocuments(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    try {
      await this.ensureSensitiveProcessAccess(req, id, true);
      // Obtener evidencias del proceso
      const evidencias = await this.processService.getEvidenceByProcessId(id);

      // Obtener el proceso con sus autos
      const proceso = await this.processService.findById(id, true);

      // Mapear evidencias a documentos
      const documentosEvidencia = evidencias.map(evidencia => {
        // Formatear tamaño
        const tamañoKB = evidencia.fileSize ? (evidencia.fileSize / 1024).toFixed(0) : '0';
        const tamaño = evidencia.fileSize >= 1024 * 1024
          ? `${(evidencia.fileSize / (1024 * 1024)).toFixed(2)} MB`
          : `${tamañoKB} KB`;

        // Mapear tipoDocumento
        const tipoMap: Record<string, 'auto' | 'evidencia' | 'oficio' | 'notificacion' | 'acta' | 'otro'> = {
          'AUTO': 'auto',
          'EVIDENCIA': 'evidencia',
          'OFICIO': 'oficio',
          'NOTIFICACION': 'notificacion',
          'ACTA': 'acta',
        };
        const tipo = tipoMap[evidencia.tipoDocumento?.toUpperCase() || ''] || 'otro';

        // Detectar si la URL es externa
        const isUrlExterna = evidencia.url && (evidencia.url.startsWith('http://') || evidencia.url.startsWith('https://'));

        return {
          id: evidencia.id,
          nombre: evidencia.nombreDocumento || evidencia.filename || 'Documento sin nombre',
          archivoNombre: evidencia.filename || evidencia.nombreDocumento || 'Documento sin nombre',
          tipo, // Si es 'auto' aquí, es un archivo subido manualmente como auto
          etapa: evidencia.etapa || 'Sin etapa',
          version: 1,
          tamaño,
          fechaCarga: evidencia.createdAt?.toISOString() || new Date().toISOString(),
          usuarioCarga: evidencia.usuarioCarga || 'Sistema',
          descripcion: evidencia.description || '',
          url: evidencia.url,
          urlExterna: isUrlExterna ? evidencia.url : null,
          downloadUrl: isUrlExterna ? null : `/control-disciplinario/api/v1/disciplinary-processes/${id}/documents/${evidencia.id}/download`,
          processId: evidencia.processId,
          fileType: evidencia.fileType,
          fileSize: evidencia.fileSize,
          versiones: [
            {
              numero: 1,
              fecha: evidencia.createdAt?.toISOString() || new Date().toISOString(),
              usuario: evidencia.usuarioCarga || 'Sistema',
              cambios: 'Versión inicial',
              tamaño,
            }
          ],
          metadatos: {
            firmado: false,
            notificado: false,
            esAutoDigital: false, // Flag para distinguir
          },
        };
      });

      // Mapear autos procesales a documentos del expediente (solo aprobados/firmados/notificados).
      const autosAprobados = (proceso.autos || []).filter((auto: any) =>
        ['APROBADO', 'FIRMADO', 'NOTIFICADO'].includes(auto.estado)
      );
      const documentosAutos = autosAprobados.map((auto: any) => {
        const sizeBytes = auto.documentSize || new TextEncoder().encode(auto.contenido || '').length;
        const tamaño = sizeBytes >= 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.max(1, (sizeBytes / 1024)).toFixed(0)} KB`;

        return {
          id: auto.id,
          nombre: `${auto.tipo || 'Auto'} ${auto.numero || ''}`.trim(),

          tipo: 'auto',
          etapa: 'Gestión', // O la etapa del auto
          version: auto.currentVersion || 1,
          tamaño,
          fechaCarga: auto.createdAt?.toISOString() || new Date().toISOString(),
          usuarioCarga: 'Sistema', // O el creador
          descripcion: auto.asunto || '',
          // Si el auto tiene un archivo físico asociado (pdf), usar esa URL.
          // Si no, usar la URL del generador de PDF (HTML).
          url: null,
          urlExterna: null,
          downloadUrl: auto.documentUrl
            ? auto.documentUrl
            : `/disciplinary-autos/${auto.id}/pdf`,
          processId: id,
          // Si hay archivo, usar su tipo. Si no, es HTML.
          fileType: auto.documentUrl ? (auto.documentType || 'application/pdf') : 'text/html',
          archivoNombre: auto.documentName || `Auto-${auto.numero || 'borrador'}.${auto.documentUrl ? 'pdf' : 'html'}`,
          fileSize: auto.documentSize || sizeBytes,
          versiones: [
            // Agregar la versión actual como la más reciente
            {
              numero: auto.currentVersion || 1,
              fecha: auto.updatedAt || auto.createdAt,
              usuario: 'Usuario Actual', // Idealmente obtener nombre
              cambios: 'Versión Actual',
              tamaño: sizeBytes >= 1024 * 1024
                ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                : `${Math.max(1, (sizeBytes / 1024)).toFixed(0)} KB`,
              downloadUrl: auto.documentUrl
                ? auto.documentUrl
                : `/disciplinary-autos/${auto.id}/pdf` // La url actual
            },
            ...(auto.versions || []).map((v: any) => {
              const vSizeBytes = new TextEncoder().encode(v.contenido || '').length;
              const vTam = vSizeBytes >= 1024 * 1024
                ? `${(vSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                : `${Math.max(1, (vSizeBytes / 1024)).toFixed(0)} KB`;

              return {
                numero: v.versionNumber,
                fecha: v.createdAt,
                usuario: v.createdBy || 'Sistema',
                cambios: v.changeReason || 'Versión guardada',
                tamaño: vTam,
                downloadUrl: `/disciplinary-autos/${auto.id}/versions/${v.versionNumber}/pdf` // URL de descarga para la versión
              };
            })],
          contenido: auto.contenido, // Incluir contenido para el editor
          metadatos: {
            firmado: auto.estado === 'FIRMADO' || auto.estado === 'NOTIFICADO',
            notificado: auto.estado === 'NOTIFICADO',
            esAutoDigital: true,
            estado: auto.estado,
            tipoAuto: auto.tipo, // Tipo específico para edición
            numero: auto.numero // Número para pre-llenar título
          },
        };
      });

      // Incluir archivos adjuntos originales de la noticia (para que aparezcan en el expediente electrónico)
      const documentosAdjuntosNoticia: any[] = [];
      if (proceso.news && Array.isArray((proceso.news as any).adjuntos) && (proceso.news as any).adjuntos.length > 0) {
        (proceso.news as any).adjuntos.forEach((adjPath: string, index: number) => {
          const filename = adjPath.includes('/') ? adjPath.split('/').pop()! : adjPath;
          const tamaño = 'N/A';
          const fecha = (proceso.news as any).createdAt?.toISOString() || new Date().toISOString();
          documentosAdjuntosNoticia.push({
            id: `adj-noticia-${(proceso.news as any).id || id}-${index}`,
            nombre: filename,
            archivoNombre: filename,
            tipo: 'otro',
            etapa: 'Recepción (Noticia Inicial)',
            version: 1,
            tamaño,
            fechaCarga: fecha,
            usuarioCarga: 'Radicador',
            descripcion: 'Archivo adjunto a la noticia disciplinaria original',
            url: null,
            urlExterna: null,
            downloadUrl: `/files/${filename}`,
            processId: id,
            fileType: 'application/octet-stream',
            fileSize: 0,
            versiones: [{
              numero: 1,
              fecha,
              usuario: 'Radicador',
              cambios: 'Adjunto de noticia inicial',
              tamaño,
              downloadUrl: `/files/${filename}`,
            }],
            metadatos: {
              firmado: false,
              notificado: false,
              esAutoDigital: false,
            },
          });
        });
      }

      // Combinar y ordenar por fecha
      const todosDocumentos = [...documentosEvidencia, ...documentosAutos, ...documentosAdjuntosNoticia].sort((a, b) => {
        return new Date(b.fechaCarga).getTime() - new Date(a.fechaCarga).getTime();
      });

      return {
        proceso: {
          id: proceso.id,
          radicadoProceso: proceso.radicadoProceso,
        },
        documentos: todosDocumentos,
      };
    } catch (error) {
      console.error('❌ ERROR en getDocuments:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener documentos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Descargar documento del expediente
   */
  @Get(':id/documents/:documentId/download')
  @ApiOperation({
    summary: 'Descargar documento',
    description: 'Descarga un documento del expediente',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo descargado',
  })
  async downloadDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') processId: string,
    @Param('documentId') documentId: string,
    @Query('view') view: string,
    @Res() res: Response,
  ) {
    await this.ensureSensitiveProcessAccess(req, processId);
    const evidencias = await this.processService.getEvidenceByProcessId(processId);
    let documento: any = evidencias.find(e => e.id === documentId);

    if (!documento) {
      // Buscar en autos antes de retornar 404
      try {
        const auto = await this.autoService.findById(documentId, []);
        if (auto) {
          // documentUrl viene como '/files/abc.pdf'; getFullPath espera solo 'abc.pdf'
          const autoUrl = auto.documentUrl ? auto.documentUrl.replace(/^\/files\//, '') : null;
          documento = { url: autoUrl, filename: auto.documentName, nombreDocumento: auto.documentName, fileType: auto.documentType };
        }
      } catch (_) {}
    }

    if (!documento) {
      throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
    }

    // Si es una URL externa, redirigir a esa URL
    const isUrlExterna = documento.url && (documento.url.startsWith('http://') || documento.url.startsWith('https://'));
    if (isUrlExterna) {
      return res.redirect(documento.url);
    }

    const rutaCompleta = this.storageService.getFullPath(documento.url);

    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      throw new HttpException('Archivo no encontrado en el servidor', HttpStatus.NOT_FOUND);
    }

    // Obtener el nombre original del archivo para la cabecera Content-Disposition
    const nombreArchivo = documento.filename || documento.nombreDocumento || 'documento';

    // Si es para visualización, enviar con content-type adecuado y disposition inline
    if (view === 'true') {
      const mimeType = documento.fileType || 'application/octet-stream';
      
      // Codificar el nombre del archivo para UTF-8 (RFC 5987)
      const encodedFilename = encodeURIComponent(nombreArchivo);
      const filenameStar = `filename*=UTF-8''${encodedFilename}`;

      res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
      res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"; ${filenameStar}`);
      
      const fileStream = fs.createReadStream(rutaCompleta);
      fileStream.pipe(res);
    } else {
      // Descarga normal con cabecera Content-Disposition attachment
      // Codificar el nombre del archivo para UTF-8 (RFC 5987)
      const encodedFilename = encodeURIComponent(nombreArchivo);
      const filenameStar = `filename*=UTF-8''${encodedFilename}`;

      res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"; ${filenameStar}`);
      
      const fileStream = fs.createReadStream(rutaCompleta);
      fileStream.pipe(res);
    }
  }

  /**
   * Eliminar documento del expediente
   */
  @Delete(':id/documents/:documentId')
  @ApiOperation({
    summary: 'Eliminar documento',
    description: 'Elimina un documento del expediente',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento eliminado',
  })
  async deleteDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') processId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.ensureSensitiveProcessAccess(req, processId);
    const evidencia = await this.processService.deleteEvidence(processId, documentId);

    if (evidencia?.url) {
      try {
        await this.storageService.deleteFile(evidencia.url);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo del disco:', error.message);
      }
    }

    return { message: 'Documento eliminado exitosamente' };
  }

  /**
   * H3: Obtener procesos del abogado actual
   */
  @Get('my-processes')
  @ApiOperation({
    summary: 'Mis Procesos',
    description: 'Retorna los procesos asignados al abogado autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de procesos del abogado',
    type: [DisciplinaryProcess],
  })
  async getMyProcesses(
    @Req() req: AuthenticatedRequest,
    @Query('abogadoId') abogadoId: string,
  ): Promise<DisciplinaryProcess[]> {
    const access = await this.getSensitiveAccessContext(req);
    
    console.log('abogadoId',abogadoId);
    

    if (access.fullAccess) {
      if (!abogadoId) {
        throw new HttpException('abogadoId es requerido', HttpStatus.BAD_REQUEST);
      }
      console.log('resultados',await this.processService.findByAbogadoId(abogadoId));

      return await this.processService.findByAbogadoId(abogadoId);
    }

    return await this.processService.findMyProcessesAccessible(
      access.userId,
      access.email,
    );
  }

  /**
   * Obtener todas las noticias RADICADA con documentos adjuntos
   * Estas noticias no tienen proceso asociado aún
   */
  @Get('radicated-news')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener Noticias Radicadas con Documentos',
    description: 'Retorna las noticias en estado RADICADA que tienen archivos adjuntos pero no tienen proceso asociado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de noticias radicadas con documentos',
  })
  async getRadicatedNewsWithDocuments(@Req() req: AuthenticatedRequest) {
    const access = await this.getSensitiveAccessContext(req);
    if (!access.fullAccess) {
      return [];
    }
    return await this.processService.findRadicatedNewsWithDocuments();
  }

  /**
   * Obtener todos los procesos
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos los Procesos',
    description: 'Retorna todos los procesos disciplinarios',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de procesos',
    type: [DisciplinaryProcess],
  })
  async getAll(@Req() req: AuthenticatedRequest): Promise<DisciplinaryProcess[]> {
    const access = await this.getSensitiveAccessContext(req);

    if (access.fullAccess) {
      return await this.processService.findAll();
    }

    return await this.processService.findAllAccessible(
      access.userId,
      access.email,
    );
  }

  /**
   * Obtener proceso por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener Proceso por ID',
    description: 'Retorna un proceso específico con sus autos',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso encontrado',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DisciplinaryProcess> {
    const access = await this.getSensitiveAccessContext(req);

    if (access.fullAccess) {
      return await this.processService.findById(id, true);
    }

    return await this.processService.findByIdAccessible(
      id,
      true,
      access.userId,
      access.email,
    );
  }

  /**
   * Eliminar proceso
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar Proceso' })
  @ApiResponse({ status: 204, description: 'Proceso eliminado' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async delete(@Param('id') id: string): Promise<void> {
    return await this.processService.delete(id);
  }

  /**
   * Remitir noticia por competencia a otra entidad
   * Envía un correo con toda la información de la noticia a la entidad destinataria
   */
  @Post('remitir-competencia')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remitir por Competencia',
    description: 'Envía la información de una noticia disciplinaria por correo a otra entidad por falta de competencia',
  })
  @ApiResponse({
    status: 200,
    description: 'Correo enviado exitosamente',
    type: RemisionPorCompetenciaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async remitirPorCompetencia(
    @Body() dto: RemitirPorCompetenciaDto,
  ): Promise<RemisionPorCompetenciaResponseDto> {
    try {
      console.log('📧 [RemitirCompetencia] Iniciando remisión por competencia...');
      console.log('📧 [RemitirCompetencia] Datos recibidos:', JSON.stringify(dto, null, 2));

      // 1. Obtener la noticia
      const noticia = await this.newsService.findById(dto.newsId);
      console.log('📧 [RemitirCompetencia] Noticia encontrada:', noticia.radicado);

      // 2. Usar la descripción proporcionada o construir desde la noticia
      const descripcionRemision = dto.descripcion || {
        numeroRadicado: noticia.radicado,
        origen: noticia.origen,
        fechaRecepcion: new Date(noticia.fechaRecepcion).toISOString(),
        territorial: noticia.territorial,
        dependenciaDenunciado: noticia.dependenciaDenunciado,
        denunciante: typeof noticia.denunciante === 'string' 
          ? JSON.parse(noticia.denunciante) 
          : noticia.denunciante,
        disciplinable: typeof noticia.disciplinable === 'string' 
          ? JSON.parse(noticia.disciplinable) 
          : noticia.disciplinable,
        hechos: noticia.hechos,
        conductas: noticia.conductas,
      };

      // 3. Construir el contenido HTML del correo
      const emailHtml = this.newsService.buildRemisionEmailContent(
        noticia,
        dto.entidadDestino,
        dto.justificacion,
        descripcionRemision,
      );
      console.log('📧 [RemitirCompetencia] HTML del correo construido');

      // 4. Enviar el correo usando el servicio de notificaciones
      const notificationsServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009';
      console.log('📧 [RemitirCompetencia] URL del servicio de notificaciones:', notificationsServiceUrl);

      const subject = `Remisión por Competencia - Noticia Disciplinaria ${dto.radicado || noticia.radicado}`;

      let subjectFinal = subject;
      let attachmentName: string | undefined;
      let attachmentBase64: string | undefined;
      let attachmentContentType = 'application/zip';

      const adjuntos = (noticia as any).adjuntos as string[] | undefined;
      if (adjuntos && Array.isArray(adjuntos) && adjuntos.length > 0) {
        try {
          const zip = new JSZip();
          for (const adjunto of adjuntos) {
            try {
              const filename = adjunto.includes('/') ? adjunto.split('/').pop()! : adjunto;
              const filePath = this.storageService.getFullPath(adjunto);
              const fileBuffer = await fsPromises.readFile(filePath);
              zip.file(filename, fileBuffer);
            } catch (adjuntoError) {
              console.error(`⚠️ [RemitirCompetencia] Error leyendo adjunto ${adjunto}:`, adjuntoError);
            }
          }
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
          attachmentName = `adjuntos_${dto.radicado || noticia.radicado}.zip`;
          attachmentBase64 = zipBuffer.toString('base64');
          subjectFinal = `${subject} (${adjuntos.length} archivo(s) adjunto(s))`;
          console.log(`📎 [RemitirCompetencia] ZIP creado con ${adjuntos.length} archivo(s)`);
        } catch (zipError) {
          console.error(`⚠️ [RemitirCompetencia] Error creando ZIP:`, zipError);
        }
      }

      const remindersBaseUrl = (notificationsServiceUrl || '').replace(/\/+$/, '');

      if (attachmentBase64 && attachmentName) {
        const emailPayload: any = {
          to: dto.emailDestinatario,
          subject: subjectFinal,
          text: `Se remite la noticia disciplinaria ${dto.radicado || noticia.radicado} por competencia a ${dto.entidadDestino}. Justificación: ${dto.justificacion}`,
          html: emailHtml,
          attachmentName,
          attachmentBase64,
          attachmentContentType,
        };
        const responseWithAttachment = await firstValueFrom(
          this.httpService.post(`${remindersBaseUrl}/api/v1/emails/send-with-attachment`, emailPayload),
        );
        console.log('📧 [RemitirCompetencia] Correo con ZIP enviado:', responseWithAttachment.data);
      } else {
        const emailPayload = {
          to: dto.emailDestinatario,
          subject: subjectFinal,
          text: `Se remite la noticia disciplinaria ${dto.radicado || noticia.radicado} por competencia a ${dto.entidadDestino}. Justificación: ${dto.justificacion}`,
          html: emailHtml,
        };
        const response = await firstValueFrom(
          this.httpService.post(`${remindersBaseUrl}/api/v1/emails/send`, emailPayload),
        );
        console.log('📧 [RemitirCompetencia] Correo enviado:', response.data);
      }

      // 5. Generar número RC
      const anio = new Date().getFullYear();
      const consecutivo = String(Math.floor(Math.random() * 9000) + 1000);
      const numeroRC = `RC-${anio}-${consecutivo}`;

      // 6. Actualizar la noticia con el estado de REMITIDA y los datos de remisión
      // Incluir la descripción detallada en la misma llamada
      console.log('📧 [RemitirCompetencia] Actualizando noticia a estado REMITIDA...');
      await this.newsService.remitirNoticia(
        dto.newsId,
        {
          numeroRC,
          entidadRemision: dto.entidadDestino,
          correoEntidadRemision: dto.emailDestinatario,
          fechaRemision: new Date(),
          tipoRemision: dto.tipoRemision || 'sin-competencia',
          justificacionRemision: dto.justificacion,
        },
        descripcionRemision,
      );

      // 8. Registrar la remisión en el historial de la noticia
      const historyEntry = {
        id: Date.now().toString(),
        tipo: 'remision_competencia',
        usuario: dto.usuarioRemision || 'Sistema',
        fecha: new Date().toISOString(),
        observaciones: `Remisión a ${dto.entidadDestino} (${dto.emailDestinatario}). Número RC: ${numeroRC}. Justificación: ${dto.justificacion}`,
        resultado: 'enviado',
        descripcion: descripcionRemision,
      };

      // Actualizar el historial de la noticia
      await this.newsService.updateHistory(dto.newsId, historyEntry);

      // Actualizar el historial de la noticia
      await this.newsService.updateHistory(dto.newsId, historyEntry);

      return {
        success: true,
        message: 'Correo enviado exitosamente',
        newsId: dto.newsId,
        emailEnviado: dto.emailDestinatario,
        fechaRemision: new Date(),
      };
    } catch (error) {
      console.error('❌ [RemitirCompetencia] Error al enviar correo:', error);
      console.error('❌ [RemitirCompetencia] Stack:', error.stack);

      // Registrar el intento fallido
      try {
        const historyEntry = {
          id: Date.now().toString(),
          tipo: 'remision_competencia',
          usuario: dto.usuarioRemision || 'Sistema',
          fecha: new Date().toISOString(),
          observaciones: `Intento de remisión a ${dto.entidadDestino} fallido. Error: ${error.message}`,
          resultado: 'error',
        };
        await this.newsService.updateHistory(dto.newsId, historyEntry);
      } catch (historyError) {
        console.error('❌ [RemitirCompetencia] Error al registrar historial:', historyError);
      }

      throw new HttpException(
        `Error al remitir por competencia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ✅ NUEVO: Asociar un proceso disciplinario a otro proceso
   */
  @Post(':id/associate-process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asociar Proceso a Otro Proceso',
    description: 'Asocia un proceso disciplinario a otro proceso existente (conexo, similar o consolidado)',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso asociado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o proceso no puede asociarse a sí mismo' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async associateProcess(
    @Param('id') procesoOrigenId: string,
    @Body() body: {
      procesoDestinoId: string;
      tipoAsociacion: 'conexo' | 'similar' | 'consolidado';
      justificacion: string;
    },
  ) {
    try {
      console.log('🔗 [AssociateProcess] Asociando proceso:', {
        procesoOrigenId,
        procesoDestinoId: body.procesoDestinoId,
        tipoAsociacion: body.tipoAsociacion,
      });

      const proceso = await this.processService.associateProcess(
        procesoOrigenId,
        body.procesoDestinoId,
        body.tipoAsociacion,
        body.justificacion,
      );

      console.log('✅ [AssociateProcess] Proceso asociado exitosamente:', proceso.id);

      return {
        success: true,
        message: 'Proceso asociado exitosamente',
        proceso: {
          id: proceso.id,
          radicadoProceso: proceso.radicadoProceso,
          procesoAsociadoId: proceso.procesoAsociadoId,
          procesoAsociadoNumero: proceso.procesoAsociadoNumero,
          procesoAsociadoTipo: proceso.procesoAsociadoTipo,
          procesoAsociadoFecha: proceso.procesoAsociadoFecha,
          // ✅ NUEVO: Incluir información de consolidación
          procesosConsolidados: proceso.procesosConsolidados,
          procesoConsolidadoPrincipal: proceso.procesoConsolidadoPrincipal,
          informacionConsolidada: proceso.informacionConsolidada,
        },
      };
    } catch (error) {
      console.error('❌ [AssociateProcess] Error:', error);
      throw new HttpException(
        `Error al asociar proceso: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Restaurar proceso archivado al flujo activo
   */
  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restaurar Proceso Archivado',
    description: 'Restaura un proceso disciplinario archivado al flujo activo',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso restaurado exitosamente',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async restore(@Param('id') id: string): Promise<DisciplinaryProcess> {
    try {
      console.log(`[ProcessController] Restaurando proceso con ID: ${id}`);
      const result = await this.processService.restore(id);
      console.log(`[ProcessController] Proceso restaurado exitosamente: ${result.id}`);
      return result;
    } catch (error) {
      console.error(`[ProcessController] Error al restaurar proceso ${id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al restaurar proceso: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

/**
    * Enviar correo electrónico
    */
   @Post('send-email')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
     summary: 'Enviar Correo Electrónico',
     description: 'Envía un correo electrónico usando el servicio de notificaciones',
   })
   @ApiResponse({
     status: 200,
     description: 'Correo enviado exitosamente',
   })
   @ApiResponse({ status: 400, description: 'Datos inválidos' })
   @ApiResponse({ status: 500, description: 'Error interno del servidor' })
   async sendEmail(@Body() emailData: { to: string; subject: string; body?: string; html?: string }) {
     try {
       const notificationsServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009';

       const emailPayload = {
         to: emailData.to,
         subject: emailData.subject,
         text: emailData.body,
         html: emailData.html,
       };

       console.log('📧 [ProcessController] Enviando correo a:', emailData.to);

       const response = await firstValueFrom(
         this.httpService.post(`${notificationsServiceUrl}/api/v1/emails/send`, emailPayload),
       );

       console.log('📧 [ProcessController] Correo enviado exitosamente:', response.data);

       return { success: true, message: 'Correo enviado exitosamente' };
     } catch (error) {
       console.error('📧 [ProcessController] Error al enviar correo:', error);
       throw new HttpException(
         `Error al enviar correo: ${error.message}`,
         HttpStatus.INTERNAL_SERVER_ERROR,
       );
     }
   }

 }
