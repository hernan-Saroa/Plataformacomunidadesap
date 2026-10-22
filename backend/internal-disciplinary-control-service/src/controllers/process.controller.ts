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
  Optional,
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
import { DocumentConversionService } from '../services/document-conversion.service';
import { ProcessExportService } from '../services/process-export.service';
import {
  IndiceElectronicoExportService,
  IndiceElectronicoDocumentoDto,
  IndiceElectronicoExpedienteDto,
  limpiarNombreArchivo,
} from '../services/indice-electronico-export.service';
import {
  FuidExportService,
  FuidItemDto,
  FuidHeaderDto,
} from '../services/fuid-export.service';
import {
  CreateDisciplinaryProcessDto,
  DisciplinaryProcessResponseDto,
} from '../dtos/create-disciplinary-process.dto';
import { ChangeStageDto } from '../dtos/change-stage.dto';
import { UpdateDisciplinaryProcessDto } from '../dtos/update-disciplinary-process.dto';
import { RemitirPorCompetenciaDto, RemisionPorCompetenciaResponseDto } from '../dtos/remitir-competencia.dto';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import {
  StorageService,
  buildStoredFileName,
  ensureUploadDirExists,
  getProcessStorageRelativePath,
  getProcessUploadDir,
  getUploadRootDir,
} from '../services/storage.service';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { diskStorage, MulterError } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';
import { PermissionsService } from '../auth/services/permissions.service';

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024 * 1024;
const MAX_STANDARD_DOCUMENT_SIZE = 50 * 1024 * 1024;
const DISCIPLINARY_FULL_PROCESS_ACCESS_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CONTROL_DISCIPLINARIO',
  'JEFE_OCID',
  'JEFE_DE_LA_OCID',
  'SECRETARIA_RADICADOR',
  'SECRETARIO_RADICADOR',
  'RADICADOR_DISCIPLINARIO',
  'RADICADOR',
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
        const uploadDir = path.resolve(ensureUploadDirExists(getUploadRootDir()));
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, path.resolve(getUploadRootDir()));
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
    private processExportService: ProcessExportService,
    private indiceElectronicoExportService: IndiceElectronicoExportService,
    private fuidExportService: FuidExportService,
    @Optional() private documentConversionService?: DocumentConversionService,
  ) { }

  private normalizeRoleCode(role: unknown): string | null {
    const raw =
      typeof role === 'string'
        ? role
        : role && typeof role === 'object'
          ? (role as any).code || (role as any).name || (role as any).nombre || ''
          : '';

    if (!raw || typeof raw !== 'string') return null;

    const normalized = raw
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (
      normalized === 'SECRETARIA_RADICADOR' ||
      normalized === 'SECRETARIO_RADICADOR' ||
      normalized === 'RADICADOR_DISCIPLINARIO' ||
      normalized === 'RADICADOR' ||
      normalized.includes('SECRETARI') ||
      normalized.includes('RADICADOR')
    ) {
      return 'SECRETARIA_RADICADOR';
    }

    return normalized || null;
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
      if (
        DISCIPLINARY_FULL_PROCESS_ACCESS_ROLES.has(role) ||
        role.includes('RADICADOR') ||
        role.includes('SECRETARI')
      ) {
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

  private async hasFullSensitiveAccessByPermissions(req: AuthenticatedRequest): Promise<boolean> {
    const normalizedRoles = Array.from(this.extractNormalizedRoles(req));
    if (normalizedRoles.length === 0) return false;

    if (normalizedRoles.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r))) {
      return true;
    }

    const userPermissions = await this.permissionsService.getPermissionsByRoles(normalizedRoles);
    return userPermissions.some(perm =>
      perm === 'control-disciplinario.general.es_jefe_ocid' ||
      perm === 'control-disciplinario.general.es_radicador' ||
      perm === 'control-disciplinario.procesos.view_all' ||
      perm === 'control-disciplinario.expediente-electronico.view_all'
    );
  }

  private async getSensitiveAccessContext(req: AuthenticatedRequest): Promise<{
    fullAccess: boolean;
    canViewAllExpedientes: boolean;
    userId?: string;
    email?: string;
  }> {
    const hasFullPermission = await this.hasFullSensitiveAccessByPermissions(req);
    const legacyFullAccess = hasFullPermission || this.hasFullSensitiveAccess(req);
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
      changeStageDto.kanbanNotice,
      req.user?.roles
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

        rutaRelativa = await this.moveUploadedFileToProcessDir(file, proceso.radicadoProceso);
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

  private async moveUploadedFileToProcessDir(
    file: Express.Multer.File,
    radicadoProceso: string,
  ): Promise<string> {
    const targetDir = getProcessUploadDir(radicadoProceso);
    ensureUploadDirExists(targetDir);

    const targetPath = path.join(targetDir, path.basename(file.filename));
    if (path.resolve(file.path) !== path.resolve(targetPath)) {
      try {
        await fsPromises.rename(file.path, targetPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EXDEV') {
          throw error;
        }

        await fsPromises.copyFile(file.path, targetPath);
        await fsPromises.unlink(file.path);
      }
    }

    file.path = targetPath;
    file.destination = targetDir;
    return getProcessStorageRelativePath(radicadoProceso, file.filename);
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
            numero: auto.numero, // Número para pre-llenar título
            radicadorAsignadoId: auto.radicadorAsignadoId || null,
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
   * Descargar el Índice Electrónico del expediente en el formato oficial EI-FO-020 (Excel).
   * Recibe el mismo listado de documentos que ya se muestra en la pestaña Índice Electrónico
   * (calculado por el frontend con getDocuments) para garantizar que el archivo generado
   * corresponda exactamente a lo que el usuario está viendo en pantalla.
   */
  @Post(':id/indice-electronico')
  @ApiOperation({
    summary: 'Descargar Índice Electrónico (EI-FO-020)',
    description: 'Genera el Índice Electrónico del expediente en el formato oficial EI-FO-020, a partir de los documentos visibles en la pestaña Índice Electrónico',
  })
  async descargarIndiceElectronico(
    @Param('id') id: string,
    @Body() body: { expediente: IndiceElectronicoExpedienteDto; documentos: IndiceElectronicoDocumentoDto[] },
    @Res() res: Response,
  ): Promise<void> {
    let expediente = body?.expediente;
    if (!expediente?.radicado || !expediente?.numeroExpediente) {
      try {
        const proceso = await this.processService.findById(id);
        if (proceso) {
          expediente = {
            ...expediente,
            radicado: expediente?.radicado || proceso.radicadoProceso || id,
            numeroExpediente: expediente?.numeroExpediente || proceso.radicadoProceso || id,
            asunto: expediente?.asunto || (proceso.news as any)?.conductas?.[0] || 'Proceso Disciplinario',
            responsable: expediente?.responsable || (proceso.abogadoAsignado as any)?.nombre || 'Sin asignar',
          };
        }
      } catch (err) {
        // Fallback seguro si falla la consulta
      }
    }

    const workbook = await this.indiceElectronicoExportService.generar(
      expediente,
      body.documentos || [],
    );

    const radicadoFinal = expediente?.numeroExpediente || expediente?.radicado || id;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="IndiceElectronico_${radicadoFinal}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Descargar FUID en lote (múltiples expedientes o filtro activo) en plantilla oficial EI-FO-003
   */
  @Post('fuid/batch')
  @ApiOperation({
    summary: 'Descargar FUID en lote (EI-FO-003)',
    description: 'Genera el FUID en formato oficial EI-FO-003 con una fila por expediente para los expedientes seleccionados o filtrados',
  })
  async descargarFuidLote(
    @Body() body: { items: FuidItemDto[]; header?: FuidHeaderDto },
    @Res() res: Response,
  ): Promise<void> {
    const workbook = await this.fuidExportService.generar(
      body.items || [],
      body.header,
    );

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const fechaPrefix = `${yyyy}${mm}${dd}`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fechaPrefix}_FUID.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Compartir el FUID (EI-FO-003) por correo electrónico como archivo adjunto (.xlsx).
   * A diferencia de "Compartir expediente", este envío NO comparte el Índice Electrónico
   * ni un enlace al expediente: remite únicamente el formato FUID generado.
   */
  @Post('fuid/share')
  @ApiOperation({
    summary: 'Compartir FUID por correo (EI-FO-003)',
    description: 'Genera el FUID en formato oficial EI-FO-003 y lo envía como adjunto al correo indicado',
  })
  async compartirFuid(
    @Body() body: {
      items: FuidItemDto[];
      header?: FuidHeaderDto;
      emailDestinatario: string;
      mensaje?: string;
      filename?: string;
    },
  ): Promise<{ success: boolean; message: string; filename: string }> {
    const email = (body?.emailDestinatario || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpException('Debe indicar un correo electrónico válido', HttpStatus.BAD_REQUEST);
    }
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      throw new HttpException('No hay expedientes para incluir en el FUID', HttpStatus.BAD_REQUEST);
    }

    const workbook = await this.fuidExportService.generar(items, body.header);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const hoy = new Date();
    const fechaPrefix = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
    const defaultName = items.length === 1
      ? `${fechaPrefix}_FUID_${items[0].radicado}.xlsx`
      : `${fechaPrefix}_FUID.xlsx`;
    const filename = (body.filename || defaultName).replace(/[\\/:*?"<>|]/g, '_');

    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const radicados = items.map(i => i.radicado).filter(Boolean);
    const listaRadicados = radicados.length <= 10
      ? radicados.join(', ')
      : `${radicados.slice(0, 10).join(', ')} y ${radicados.length - 10} más`;
    const mensaje = (body.mensaje || '').trim();
    const remitente = body.header?.elaboradoPor?.trim();

    const subject = items.length === 1
      ? `FUID - Expediente ${radicados[0]} - Control Interno Disciplinario ESAP`
      : `FUID - ${items.length} expedientes - Control Interno Disciplinario ESAP`;
    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b;">
        <h2 style="color: #003DA5;">Formato Único de Inventario Documental (FUID)</h2>
        <p>Se remite adjunto el FUID (EI-FO-003) de la Oficina de Control Interno Disciplinario
        correspondiente a ${items.length === 1 ? 'el expediente' : 'los expedientes'}: <strong>${escapeHtml(listaRadicados)}</strong>.</p>
        ${mensaje ? `<p><strong>Mensaje:</strong><br/>${escapeHtml(mensaje).replace(/\n/g, '<br/>')}</p>` : ''}
        ${remitente ? `<p><strong>Elaborado por:</strong> ${escapeHtml(remitente)}</p>` : ''}
        <hr />
        <p style="font-size: 12px; color: #64748b;">Escuela Superior de Administración Pública - ESAP</p>
      </div>
    `;

    const baseNotifUrl = process.env.NOTIFICATION_SERVICE_URL || process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3009';
    const uniqueBases = Array.from(new Set([
      baseNotifUrl,
      baseNotifUrl.replace('notifications-service', 'localhost'),
      'http://localhost:3009',
      'http://127.0.0.1:3009',
    ].map(u => (u || '').replace(/\/+$/, ''))));

    const emailPayload = {
      to: email,
      subject,
      text: `Se remite adjunto el FUID (EI-FO-003) de: ${listaRadicados}.${mensaje ? ` Mensaje: ${mensaje}` : ''}`,
      html,
      attachments: [{
        filename,
        contentBase64: buffer.toString('base64'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }],
    };

    let lastError = '';
    for (const base of uniqueBases) {
      try {
        await firstValueFrom(
          this.httpService.post(`${base}/api/v1/emails/send`, emailPayload, { timeout: 15000 }),
        );
        return { success: true, message: `FUID enviado a ${email}`, filename };
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`⚠️ [CompartirFUID] Intento vía ${base} no completado: ${lastError}`);
      }
    }

    throw new HttpException(
      `No fue posible enviar el FUID por correo: ${lastError}`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Descargar FUID individual de un expediente en plantilla oficial EI-FO-003
   */
  @Post(':id/fuid')
  @ApiOperation({
    summary: 'Descargar FUID individual (EI-FO-003)',
    description: 'Genera el FUID del expediente en formato oficial EI-FO-003 con una sola fila para el expediente',
  })
  async descargarFuidIndividual(
    @Param('id') id: string,
    @Body() body: { item: FuidItemDto; header?: FuidHeaderDto },
    @Res() res: Response,
  ): Promise<void> {
    let item = body?.item;
    if (!item?.radicado) {
      try {
        const proceso = await this.processService.findById(id);
        if (proceso) {
          item = {
            ...item,
            radicado: proceso.radicadoProceso || id,
            nombreDisciplinado: (proceso.news as any)?.disciplinable?.nombre || 'Sin nombre',
            asunto: (proceso.news as any)?.conductas?.[0] || 'Proceso Disciplinario',
            notas: proceso.etapaActual || proceso.estado || 'En Proceso',
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    const items = item ? [item] : [];
    const workbook = await this.fuidExportService.generar(
      items,
      body.header,
    );

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const fechaPrefix = `${yyyy}${mm}${dd}`;
    const radicadoClean = item?.radicado || id;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fechaPrefix}_FUID_${radicadoClean}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Descargar documento del expediente
   */
  @Public()
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
    if (req.user) {
      await this.ensureSensitiveProcessAccess(req, processId);
    }
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

    let rutaCompleta = this.storageService.getFullPath(documento.url);

    // Verificar que el archivo existe; si no, buscar por nombre en uploads base o en subdirectorios
    if (!fs.existsSync(rutaCompleta)) {
      const safeFilename = path.basename(documento.url || documento.filename || '');
      const cwdUploads = path.resolve(process.cwd(), 'uploads', safeFilename);
      if (fs.existsSync(cwdUploads)) {
        rutaCompleta = cwdUploads;
      } else {
        const uploadsRoot = path.resolve(getUploadRootDir());
        let fallback: string | null = null;
        const candidateRoots = [uploadsRoot, path.resolve(process.cwd(), 'uploads')];
        for (const root of candidateRoots) {
          if (!safeFilename || !fs.existsSync(root)) continue;
          const directFile = path.join(root, safeFilename);
          if (fs.existsSync(directFile)) {
            fallback = directFile;
            break;
          }
          outer: for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const l1 = path.join(root, entry.name, safeFilename);
            if (fs.existsSync(l1)) { fallback = l1; break; }
            const l1dir = path.join(root, entry.name);
            try {
              for (const sub of fs.readdirSync(l1dir, { withFileTypes: true })) {
                if (!sub.isDirectory()) continue;
                const l2 = path.join(l1dir, sub.name, safeFilename);
                if (fs.existsSync(l2)) { fallback = l2; break outer; }
              }
            } catch (_) {}
          }
          if (fallback) break;
        }
        if (!fallback) {
          throw new HttpException('Archivo no encontrado en el servidor', HttpStatus.NOT_FOUND);
        }
        rutaCompleta = fallback;
      }
    }

    // Obtener el nombre original del archivo para la cabecera Content-Disposition
    const rawNombre = documento.filename || documento.nombreDocumento || 'documento';
    const nombreArchivo = limpiarNombreArchivo(rawNombre) || rawNombre;

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
    summary: 'Obtener Noticias Radicadas',
    description: 'Retorna las noticias en estado RADICADA que no tienen proceso asociado (con o sin adjuntos)',
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
   * Exportar informe de vencimientos de los procesos disciplinarios (Excel)
   * Solo disponible para el Radicador (rol SECRETARIA_RADICADOR)
   */
  @Get('export')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SECRETARIA_RADICADOR', 'RADICADOR_DISCIPLINARIO')
  @ApiOperation({
    summary: 'Exportar informe de vencimientos',
    description: 'Genera y descarga el informe de vencimientos de los procesos disciplinarios en formato Excel',
  })
  async exportVencimientos(@Res() res: Response): Promise<void> {
    const workbook = await this.processExportService.generateVencimientosReport();
    const fecha = new Date().toISOString().split('T')[0];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Informe_Vencimientos_OCID_${fecha}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
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

      // 1. Obtener proceso y/o noticia
      let noticia: any = null;
      let proceso: any = null;

      if (dto.processId) {
        try {
          proceso = await this.processService.findById(dto.processId, true);
        } catch (e) {
          console.warn('Proceso no encontrado por ID:', dto.processId);
        }
        if (proceso?.newsId) {
          try {
            noticia = await this.newsService.findById(proceso.newsId);
          } catch (e) {
            console.warn('Noticia no encontrada para proceso:', proceso.newsId);
          }
        }
      }

      if (!noticia && dto.newsId) {
        try {
          noticia = await this.newsService.findById(dto.newsId);
        } catch (e) {
          console.warn('Noticia no encontrada por ID:', dto.newsId);
        }
        if (!proceso && dto.newsId) {
          try {
            const procesos = await this.processService.findByNewsId(dto.newsId);
            if (procesos && procesos.length > 0) {
              proceso = procesos[0];
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (!noticia && !proceso) {
        throw new HttpException('No se encontró la noticia ni el proceso para remitir', HttpStatus.NOT_FOUND);
      }

      const radicadoIdentificador = dto.radicado || proceso?.radicadoProceso || noticia?.radicado || 'SIN_RADICADO';

      // 2. Usar la descripción proporcionada o construir desde la noticia o proceso
      const descripcionRemision = dto.descripcion || {
        numeroRadicado: radicadoIdentificador,
        origen: noticia?.origen || 'REMISION',
        fechaRecepcion: noticia?.fechaRecepcion ? new Date(noticia.fechaRecepcion).toISOString() : new Date().toISOString(),
        territorial: noticia?.territorial || 'Sede Central',
        dependenciaDenunciado: noticia?.dependenciaDenunciado || 'N/A',
        denunciante: noticia ? (typeof noticia.denunciante === 'string' ? JSON.parse(noticia.denunciante) : noticia.denunciante) : 'N/A',
        disciplinable: noticia ? (typeof noticia.disciplinable === 'string' ? JSON.parse(noticia.disciplinable) : noticia.disciplinable) : 'N/A',
        hechos: noticia?.hechos || proceso?.observaciones || 'Sin hechos registrados',
        conductas: noticia?.conductas || [],
        fechaHechos: noticia?.fechaHechos || null,
        fechaCaducidad: noticia?.fechaCaducidad || null,
      };

      // 3. Construir el contenido HTML del correo
      const emailHtml = noticia
        ? this.newsService.buildRemisionEmailContent(
            noticia,
            dto.entidadDestino,
            dto.justificacion,
            descripcionRemision,
          )
        : `
          <div style="font-family: Arial, sans-serif; color: #1e293b;">
            <h2>Remisión por Competencia - Control Interno Disciplinario ESAP</h2>
            <p>Se remite el expediente correspondiente al proceso disciplinario <strong>${radicadoIdentificador}</strong> por falta de competencia a la entidad <strong>${dto.entidadDestino}</strong>.</p>
            <p><strong>Justificación:</strong> ${dto.justificacion}</p>
            <hr />
            <p style="font-size: 12px; color: #64748b;">Escuela Superior de Administración Pública - ESAP</p>
          </div>
        `;
      console.log('📧 [RemitirCompetencia] HTML del correo construido');

      // 4. Enviar el correo usando el servicio de notificaciones
      const baseNotifUrl = process.env.NOTIFICATION_SERVICE_URL || process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3009';
      // Candidatos para resolver tanto en Docker como en localhost
      const candidateBases = [
        baseNotifUrl,
        baseNotifUrl.replace('notifications-service', 'localhost'),
        'http://localhost:3009',
        'http://127.0.0.1:3009',
      ];
      const uniqueBases = Array.from(new Set(candidateBases.map(u => (u || '').replace(/\/+$/, ''))));
      console.log('📧 [RemitirCompetencia] URLs candidatas del servicio de notificaciones:', uniqueBases);

      const subject = `Remisión por Competencia - Proceso/Noticia Disciplinaria ${radicadoIdentificador}`;

      let subjectFinal = subject;
      // 4. Recopilar todos los archivos del expediente como adjuntos individuales:
      // - Auto(s) aprobado(s) de remisión: obligatoriamente en formato PDF.
      // - El resto de archivos (queja inicial/noticia, actas, evidencias, pruebas): en su formato original.
      // - Sin empaquetar en ZIP, ya que las entidades de control devuelven el trámite si viene en ZIP.
      const uploadFolderRadicado = noticia?.radicado || proceso?.radicadoProceso || radicadoIdentificador;
      const resolverRuta = (referencia?: string | null): string | null => {
        if (!referencia) return null;
        try {
          const limpia = referencia.replace(/^\/files\//, '').replace(/^\/+/, '');
          const directa = this.storageService.getFullPath(limpia);
          if (fs.existsSync(directa)) return directa;
          const uploadsRoot = path.resolve(getUploadRootDir());
          const cwdUploads = path.resolve(process.cwd(), 'uploads');
          const base = path.basename(limpia);
          const candidatos = [
            path.join(getProcessUploadDir(uploadFolderRadicado), base),
            path.join(uploadsRoot, base),
            path.join(cwdUploads, base),
            path.join(uploadsRoot, limpia),
            path.join(cwdUploads, limpia),
          ];
          for (const c of candidatos) {
            if (fs.existsSync(c)) return c;
          }
        } catch (_) {}
        return null;
      };

      const getMimeType = (filename: string): string => {
        const ext = path.extname(filename).toLowerCase().replace(/^\./, '');
        const map: Record<string, string> = {
          pdf: 'application/pdf',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xls: 'application/vnd.ms-excel',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ppt: 'application/vnd.ms-powerpoint',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          bmp: 'image/bmp',
          webp: 'image/webp',
          txt: 'text/plain',
          csv: 'text/csv',
          rtf: 'application/rtf',
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          mp4: 'video/mp4',
          avi: 'video/x-msvideo',
          zip: 'application/zip',
        };
        return map[ext] || 'application/octet-stream';
      };

      const sanitizeFilename = (name: string): string => {
        return path.basename(name).replace(/[\/\\?%*:|"<>]/g, '_').trim();
      };

      const usedFilenames = new Set<string>();
      const getUniqueFilename = (proposed: string): string => {
        let clean = sanitizeFilename(proposed);
        if (!clean) clean = 'documento';

        if (!usedFilenames.has(clean.toLowerCase())) {
          usedFilenames.add(clean.toLowerCase());
          return clean;
        }

        const ext = path.extname(clean);
        const base = path.basename(clean, ext);
        let counter = 1;
        let candidate = `${base}_(${counter})${ext}`;
        while (usedFilenames.has(candidate.toLowerCase())) {
          counter++;
          candidate = `${base}_(${counter})${ext}`;
        }
        usedFilenames.add(candidate.toLowerCase());
        return candidate;
      };

      const autosProceso = proceso?.id ? await this.autoService.findByProcessId(proceso.id) : [];
      let evidenciasProceso: any[] = [];
      try {
        if (proceso?.evidence && Array.isArray(proceso.evidence) && proceso.evidence.length > 0) {
          evidenciasProceso = proceso.evidence;
        } else if (proceso?.id) {
          evidenciasProceso = await this.processService.getEvidenceByProcessId(proceso.id);
        }
      } catch (_) {}

      const adjuntosNoticia = Array.isArray(noticia?.adjuntos) ? noticia.adjuntos : [];
      const pruebasProceso = Array.isArray(proceso?.pruebas) ? proceso.pruebas : [];

      const emailAttachments: Array<{ filename: string; contentBase64: string; contentType: string }> = [];
      const attachedRutas = new Set<string>();

      // A. Autos del proceso (incluyendo el Auto de Remisión por Competencia aprobado)
      // Requisito normativo: El auto aprobado debe llegar estrictamente en formato PDF.
      for (const auto of autosProceso) {
        let agregado = false;
        const ref = auto.firmaUrl || auto.documentUrl;
        if (ref) {
          const ruta = resolverRuta(ref);
          if (ruta && !attachedRutas.has(ruta)) {
            try {
              const ext = path.extname(ruta).toLowerCase();
              if (ext === '.pdf') {
                const buf = await fsPromises.readFile(ruta);
                const nombreSugerido = auto.documentName?.toLowerCase().endsWith('.pdf')
                  ? auto.documentName
                  : (auto.numero ? `${auto.numero}.pdf` : `Auto_${auto.tipo || 'Auto'}_${auto.id}.pdf`);
                emailAttachments.push({
                  filename: getUniqueFilename(nombreSugerido),
                  contentBase64: buf.toString('base64'),
                  contentType: 'application/pdf',
                });
                attachedRutas.add(ruta);
                agregado = true;
              } else if ((ext === '.docx' || ext === '.doc') && this.documentConversionService) {
                try {
                  const nombrePdf = auto.numero ? `${auto.numero}.pdf` : `Auto_${auto.tipo || 'Auto'}_${auto.id}.pdf`;
                  const converted = await this.documentConversionService.convertWordToPdf(ref, nombrePdf);
                  const rutaConverted = this.storageService.getFullPath(converted.documentUrl);
                  if (fs.existsSync(rutaConverted)) {
                    const buf = await fsPromises.readFile(rutaConverted);
                    emailAttachments.push({
                      filename: getUniqueFilename(nombrePdf),
                      contentBase64: buf.toString('base64'),
                      contentType: 'application/pdf',
                    });
                    attachedRutas.add(ruta);
                    attachedRutas.add(rutaConverted);
                    agregado = true;
                  }
                } catch (convErr) {
                  console.warn('[RemitirCompetencia] No se pudo convertir auto Word a PDF:', convErr);
                }
              }
            } catch (err) {
              console.warn('[RemitirCompetencia] Error leyendo archivo de auto:', ref, err);
            }
          }
        }

        // Si no se encontró archivo en disco pero hay contenido HTML del auto,
        // generar PDF a partir del contenido para cumplir la exigencia de que el auto sea PDF
        if (!agregado && auto.contenido && auto.contenido.trim().length > 0) {
          const nombrePdf = auto.numero ? `${auto.numero}.pdf` : `Auto_${auto.tipo || 'Auto'}_${auto.id}.pdf`;
          let pdfBuffer: Buffer | null = null;
          try {
            const autoHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${auto.tipo || 'Auto'}</title><style>body{font-family:Arial,sans-serif;margin:40px;line-height:1.6;color:#1e293b;}</style></head><body>${auto.contenido}</body></html>`;
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.default.launch({
              headless: 'new' as any,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
              executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            });
            const page = await browser.newPage();
            await page.setContent(autoHtml, { waitUntil: 'networkidle0' });
            pdfBuffer = Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
            await browser.close();
          } catch (pupErr) {
            console.warn('[RemitirCompetencia] Falló conversión con Puppeteer, intentando PDFDocument:', pupErr);
            try {
              const PDFDocument = require('pdfkit');
              const doc = new PDFDocument({ margin: 50 });
              const chunks: Buffer[] = [];
              doc.on('data', (chunk: Buffer) => chunks.push(chunk));
              doc.fontSize(16).text(auto.tipo || 'Auto', { align: 'center' });
              doc.moveDown();
              const plainText = auto.contenido.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              doc.fontSize(11).text(plainText, { align: 'justify' });
              doc.end();
              pdfBuffer = await new Promise<Buffer>((resolve) => {
                doc.on('end', () => resolve(Buffer.concat(chunks)));
              });
            } catch (pdfKitErr) {
              console.error('[RemitirCompetencia] Falló fallback PDFKit:', pdfKitErr);
            }
          }

          if (pdfBuffer) {
            emailAttachments.push({
              filename: getUniqueFilename(nombrePdf),
              contentBase64: pdfBuffer.toString('base64'),
              contentType: 'application/pdf',
            });
            agregado = true;
          }
        }
      }

      // B. Soportes iniciales de la queja / noticia (en su formato original)
      for (const adj of adjuntosNoticia) {
        const ref = typeof adj === 'string' ? adj : (adj?.url || adj?.path || adj?.filename || null);
        if (!ref) continue;
        const ruta = resolverRuta(ref);
        if (ruta && !attachedRutas.has(ruta)) {
          try {
            const buf = await fsPromises.readFile(ruta);
            const nombreOriginal = typeof adj === 'object' && adj?.nombre
              ? adj.nombre
              : path.basename(ruta);
            const mime = (typeof adj === 'object' && (adj?.tipo || adj?.contentType)) || getMimeType(nombreOriginal);
            emailAttachments.push({
              filename: getUniqueFilename(nombreOriginal),
              contentBase64: buf.toString('base64'),
              contentType: mime,
            });
            attachedRutas.add(ruta);
          } catch (err) {
            console.warn('[RemitirCompetencia] Error leyendo soporte queja:', adj, err);
          }
        }
      }

      // C. Actas y Evidencias del proceso (en su formato original)
      for (const ev of evidenciasProceso) {
        const ref = ev.archivoUrl || ev.url || ev.filename;
        if (!ref) continue;
        const ruta = resolverRuta(ref);
        if (ruta && !attachedRutas.has(ruta)) {
          try {
            const buf = await fsPromises.readFile(ruta);
            const nombreOriginal = ev.nombreArchivo || ev.nombreDocumento || path.basename(ruta);
            const mime = ev.fileType || getMimeType(nombreOriginal);
            emailAttachments.push({
              filename: getUniqueFilename(nombreOriginal),
              contentBase64: buf.toString('base64'),
              contentType: mime,
            });
            attachedRutas.add(ruta);
          } catch (err) {
            console.warn('[RemitirCompetencia] Error leyendo evidencia:', ref, err);
          }
        }
      }

      // D. Pruebas del proceso (en su formato original)
      for (const p of pruebasProceso) {
        const ref = typeof p === 'string' ? p : (p?.url || p?.archivoUrl || p?.filename || null);
        if (!ref) continue;
        const ruta = resolverRuta(ref);
        if (ruta && !attachedRutas.has(ruta)) {
          try {
            const buf = await fsPromises.readFile(ruta);
            const nombreOriginal = typeof p === 'object' && p?.nombre
              ? p.nombre
              : path.basename(ruta);
            const mime = (typeof p === 'object' && (p?.tipo || p?.contentType)) || getMimeType(nombreOriginal);
            emailAttachments.push({
              filename: getUniqueFilename(nombreOriginal),
              contentBase64: buf.toString('base64'),
              contentType: mime,
            });
            attachedRutas.add(ruta);
          } catch (_) {}
        }
      }

      if (emailAttachments.length > 0) {
        subjectFinal = `${subject} (${emailAttachments.length} archivos adjuntos)`;
        console.log(`📎 [RemitirCompetencia] Preparados ${emailAttachments.length} archivo(s) adjunto(s) directo(s) (Auto en PDF, demás en formato original):`, emailAttachments.map(a => a.filename));
      }

      let emailEnviado = false;
      let emailErrorMsg = '';

      for (const remindersBaseUrl of uniqueBases) {
        try {
          const emailPayload: any = {
            to: dto.emailDestinatario,
            subject: subjectFinal,
            text: `Se remite el expediente ${radicadoIdentificador} por competencia a ${dto.entidadDestino}. Justificación: ${dto.justificacion}`,
            html: emailHtml,
            attachments: emailAttachments,
          };
          const response = await firstValueFrom(
            this.httpService.post(`${remindersBaseUrl}/api/v1/emails/send`, emailPayload, { timeout: 15000 }),
          );
          console.log(`📧 [RemitirCompetencia] Correo con ${emailAttachments.length} adjunto(s) enviado vía ${remindersBaseUrl}:`, response?.data);
          emailEnviado = true;
          break;
        } catch (postErr: any) {
          emailErrorMsg = postErr?.message || String(postErr);
          console.warn(`⚠️ [RemitirCompetencia] Intento vía ${remindersBaseUrl} no completado: ${emailErrorMsg}`);
        }
      }

      if (!emailEnviado) {
        console.warn(`⚠️ [RemitirCompetencia] Advertencia al contactar el servicio de notificaciones: ${emailErrorMsg}. El proceso de remisión continúa.`);
      }

      // 5. Generar número RC
      const anio = new Date().getFullYear();
      const consecutivo = String(Math.floor(Math.random() * 9000) + 1000);
      const numeroRC = `RC-${anio}-${consecutivo}`;

      // 6. Actualizar la noticia si existe
      if (noticia?.id) {
        console.log('📧 [RemitirCompetencia] Actualizando noticia a estado REMITIDA...');
        const descConArchivos = {
          ...descripcionRemision,
          totalArchivos: emailAttachments.length,
          archivosRemitidos: emailAttachments.map(a => a.filename),
          autos: autosProceso.map(a => ({
            id: a.id,
            tipo: a.tipo,
            numero: a.numero,
            nombre: a.documentName || (a.numero ? `${a.numero}.pdf` : `Auto_${a.tipo}_${a.id}.pdf`),
            url: a.firmaUrl || a.documentUrl || (a.numero ? `/files/${a.numero}.pdf` : undefined),
            documentUrl: a.documentUrl,
            firmaUrl: a.firmaUrl,
            documentName: a.documentName,
            contenido: a.contenido,
            estado: a.estado,
            fecha: a.createdAt,
          })),
          actasYEvidencias: evidenciasProceso.map(e => ({
            id: e.id,
            nombre: e.nombreArchivo || e.nombreDocumento || 'Documento',
            url: e.archivoUrl || e.url,
            tipo: e.tipoDocumento || e.tipo,
            fecha: e.createdAt,
          })),
        };

        const todosLosAdjuntos = Array.from(new Set([
          ...(noticia.adjuntos || []),
          ...autosProceso.map(a => a.firmaUrl || a.documentUrl).filter(Boolean),
          ...evidenciasProceso.map(e => e.archivoUrl || e.url).filter(Boolean),
          ...pruebasProceso,
        ]));

        await this.newsService.remitirNoticia(
          noticia.id,
          {
            numeroRC,
            entidadRemision: dto.entidadDestino,
            correoEntidadRemision: dto.emailDestinatario,
            fechaRemision: new Date(),
            tipoRemision: dto.tipoRemision || 'sin-competencia',
            justificacionRemision: dto.justificacion,
          },
          descConArchivos,
        );

        try {
          await this.newsService.update(noticia.id, { adjuntos: todosLosAdjuntos } as any);
        } catch (_) {}

        const historyEntry = {
          id: Date.now().toString(),
          tipo: 'remision_competencia',
          usuario: dto.usuarioRemision || 'Sistema',
          fecha: new Date().toISOString(),
          observaciones: `Remisión a ${dto.entidadDestino} (${dto.emailDestinatario}). Número RC: ${numeroRC}. Archivos adjuntos en expediente: ${emailAttachments.length}. Justificación: ${dto.justificacion}`,
          resultado: 'enviado',
          descripcion: descConArchivos,
        };
        await this.newsService.updateHistory(noticia.id, historyEntry);
      }

      // 7. Actualizar el proceso si existe
      if (proceso?.id) {
        console.log('📧 [RemitirCompetencia] Actualizando proceso con remisión...');
        await this.processService.remitirProceso(proceso.id, {
          numeroRC,
          entidadRemision: dto.entidadDestino,
          correoEntidadRemision: dto.emailDestinatario,
          fechaRemision: new Date(),
          tipoRemision: dto.tipoRemision || 'sin-competencia',
          justificacionRemision: dto.justificacion,
          descripcionRemision,
        });
      }

      return {
        success: true,
        message: 'Correo enviado exitosamente',
        newsId: noticia?.id || dto.newsId,
        processId: proceso?.id || dto.processId,
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
        if (dto.newsId) {
          await this.newsService.updateHistory(dto.newsId, historyEntry);
        }
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
