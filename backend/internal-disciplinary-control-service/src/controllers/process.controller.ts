import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProcessService } from '../services/process.service';
import {
  CreateDisciplinaryProcessDto,
  DisciplinaryProcessResponseDto,
} from '../dtos/create-disciplinary-process.dto';
import { ChangeStageDto } from '../dtos/change-stage.dto';
import { UpdateDisciplinaryProcessDto } from '../dtos/update-disciplinary-process.dto';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { StorageService } from '../services/storage.service';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Procesos Disciplinarios')
@Controller('disciplinary-processes')
export class ProcessController {
  constructor(
    private processService: ProcessService,
    private storageService: StorageService,
  ) { }

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
  async getProcessStatistics(@Param('id') id: string) {
    return await this.processService.getProcessStatistics(id);
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
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryProcessDto,
  ): Promise<DisciplinaryProcess> {
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
  async getByRadicado(@Param('radicado') radicado: string): Promise<DisciplinaryProcess> {
    return await this.processService.findByRadicado(radicado);
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
    @Param('id') id: string,
    @Body() changeStageDto: ChangeStageDto,
  ): Promise<DisciplinaryProcess> {
    return await this.processService.changeStage(
      id,
      changeStageDto.stage,
      changeStageDto.kanbanStage,
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
    @Param('id') id: string,
    @Body() body: { url: string; originalName: string },
  ): Promise<DisciplinaryProcess> {
    return await this.processService.addEvidence(id, body.url, body.originalName);
  }

  /**
   * Subir documento al expediente del proceso
   */
  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
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
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { tipo?: string; descripcion?: string; nombre?: string; etapa?: string; usuarioCarga?: string; categoria?: string; destinatario?: string; asunto?: string; participantes?: string; urlExterna?: string },
  ) {
    try {
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

      // Validar tamaño del archivo si se proporciona
      if (file && file.size > 50 * 1024 * 1024) {
        throw new HttpException(
          'El archivo excede el tamaño máximo permitido de 50MB',
          HttpStatus.BAD_REQUEST,
        );
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
          throw new HttpException(
            'Solo se permiten archivos PDF para oficios',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Guardar archivo usando storage service
        rutaRelativa = await this.storageService.saveFile(
          proceso.radicadoProceso,
          {
            buffer: file.buffer,
            originalname: file.originalname,
          },
          tipoDocumento,
        );
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
      throw new HttpException(
        `Error al subir documento: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
  async getDocuments(@Param('id') id: string) {
    try {
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

      // Mapear autos procesales a documentos
      const documentosAutos = (proceso.autos || []).map((auto: any) => {
        // Calcular tamaño aproximado del contenido HTML
        const sizeBytes = new TextEncoder().encode(auto.contenido || '').length;
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
          fileSize: sizeBytes,
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

      // Combinar y ordenar por fecha
      const todosDocumentos = [...documentosEvidencia, ...documentosAutos].sort((a, b) => {
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
    @Param('id') processId: string,
    @Param('documentId') documentId: string,
    @Query('view') view: string,
    @Res() res: Response,
  ) {
    const evidencias = await this.processService.getEvidenceByProcessId(processId);
    const documento = evidencias.find(e => e.id === documentId);

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

    // Si es para visualización, enviar con content-type adecuado
    if (view === 'true') {
      const mimeType = documento.fileType || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${documento.filename}"`);
      const fileStream = fs.createReadStream(rutaCompleta);
      fileStream.pipe(res);
    } else {
      // Descarga normal
      res.download(rutaCompleta, documento.filename);
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
    @Param('id') processId: string,
    @Param('documentId') documentId: string,
  ) {
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
    @Query('abogadoId') abogadoId: string,
  ): Promise<DisciplinaryProcess[]> {
    if (!abogadoId) {
      throw new Error('abogadoId es requerido');
    }
    return await this.processService.findByAbogadoId(abogadoId);
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
  async getAll(): Promise<DisciplinaryProcess[]> {
    return await this.processService.findAll();
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
  async getById(@Param('id') id: string): Promise<DisciplinaryProcess> {
    return await this.processService.findById(id, true); // Cargar autos para vista completa
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
}
