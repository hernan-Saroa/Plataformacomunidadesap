import {
  Controller,
  Post,
  Put,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AutoService } from '../services/auto.service';
import { OnlyOfficeService } from '../services/onlyoffice.service';
import {
  CreateLegalAutoDto,
} from '../dtos/create-legal-auto.dto';
import { ReviewAutoDto } from '../dtos/review-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { LegalAuto } from '../entities/legal-auto.entity';

@ApiTags('Autos Legales')
@Controller('disciplinary-autos')
export class AutoController {
  constructor(
    private autoService: AutoService,
    private onlyOfficeService: OnlyOfficeService,
  ) { }

  /**
   * H9: Crear borrador de auto
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear Borrador de Auto',
    description: 'Crea un nuevo borrador de auto legal',
  })
  @ApiResponse({
    status: 201,
    description: 'Auto creado en borrador',
    type: LegalAuto,
  })
  async create(@Body() createAutoDto: CreateLegalAutoDto): Promise<LegalAuto> {
    return await this.autoService.create(createAutoDto);
  }

  /**
   * Obtener todos los autos
   */
  @Get()
  @ApiOperation({ summary: 'Listar Autos', description: 'Retorna todos los autos registrados con URLs de versión' })
  async findAll() {
    const autos = await this.autoService.findAll();
    return autos.map(auto => this.mapAutoResponse(auto));
  }

  /**
   * Obtener autos por proceso
   */
  @Get('by-process/:processId')
  @ApiOperation({ summary: 'Listar Autos por Proceso', description: 'Retorna los autos de un proceso específico con URLs de versión' })
  async findByProcess(@Param('processId') processId: string) {
    const autos = await this.autoService.findByProcessId(processId);
    // Temporarily return raw data to debug
    return autos;
  }

  /**
   * Helper para mapear auto y sus versiones con downloadUrl y formato frontend
   */
  /**
   * Helper para mapear auto y sus versiones con downloadUrl y formato frontend
   */
  private mapAutoResponse(auto: LegalAuto) {
    const sizeBytes = auto.documentSize || new TextEncoder().encode(auto.contenido || '').length;
    const formatSize = (bytes: number) => bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, (bytes / 1024)).toFixed(0)} KB`;

    const versiones = [
      // Versión Actual
      {
        numero: auto.currentVersion || 1,
        fecha: auto.updatedAt || auto.createdAt,
        usuario: 'Usuario Actual',
        cambios: 'Versión Actual',
        tamaño: formatSize(sizeBytes),
        downloadUrl: auto.documentUrl ? auto.documentUrl : `/disciplinary-autos/${auto.id}/pdf`
      },
      // Historial
      ...(auto.versions || []).map(v => {
        const vBytes = new TextEncoder().encode(v.contenido || '').length; // Si tuviera documentSize en version usariamos ese
        return {
          numero: v.versionNumber,
          usuario: v.createdBy || 'Sistema',
          fecha: v.createdAt,
          cambios: v.changeReason || 'Versión guardada',
          tamaño: formatSize(vBytes),
          downloadUrl: `/disciplinary-autos/${auto.id}/versions/${v.versionNumber}/pdf`
        };
      })
    ];

    return {
      ...auto,
      versiones,
      metadatos: {
        firmado: auto.estado === 'FIRMADO' || auto.estado === 'NOTIFICADO',
        esAutoDigital: true,
        tipoAuto: auto.tipo,
        numero: auto.numero
      }
    };
  }

  /**
   * Obtener Auto por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener Auto por ID', description: 'Retorna un auto específico por su ID' })
  async findOne(@Param('id') id: string): Promise<LegalAuto> {
    return await this.autoService.findById(id);
  }

  /**
   * Actualizar Auto (Metadata y Contenido)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar Auto',
    description: 'Actualiza metadatos y contenido/archivo de un auto. Crea versión si cambia contenido.',
  })
  @ApiResponse({ status: 200, description: 'Auto actualizado', type: LegalAuto })
  async update(
    @Param('id') id: string,
    @Body() updateData: any
  ): Promise<LegalAuto> {
    return await this.autoService.update(id, updateData);
  }

  /**
   * H3: Enviar auto a revisión
   */
  @Patch(':id/send-review')
  @ApiOperation({
    summary: 'Enviar a Revisión',
    description: 'Cambia el estado del auto a REVISION_JEFE',
  })
  async sendToReview(@Param('id') id: string): Promise<LegalAuto> {
    return await this.autoService.sendToReview(id);
  }

  /**
   * H4: Aprobar/Firmar auto (operación de Jefe)
   */
  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprobar y Firmar Auto',
    description: 'El Jefe aprueba el auto y genera la firma',
  })
  async approve(
    @Param('id') id: string,
    @Body() reviewAutoDto: ReviewAutoDto,
    @Query('aprobadoPorId') aprobadoPorId: string,
  ): Promise<LegalAuto> {
    if (!aprobadoPorId) {
      throw new Error('aprobadoPorId es requerido');
    }
    return await this.autoService.approve(id, reviewAutoDto, aprobadoPorId);
  }

  /**
   * Firmar Auto (Paso Final)
   */
  @Patch(':id/sign')
  @ApiOperation({
    summary: 'Firmar Auto Digitalmente',
    description: 'Genera la firma digital final del auto',
  })
  async sign(
    @Param('id') id: string,
    @Body() signData: any, // Acepta metadatos del archivo firmado localmente
    @Query('userId') userId: string,
  ): Promise<LegalAuto> {
    if (!userId) throw new Error('UserId requerido para firma');
    return await this.autoService.sign(id, userId, signData);
  }


  @Patch(':id/notify')
  @ApiOperation({
    summary: 'Registrar Notificación',
    description: 'Registra la fecha y evidencia de la notificación al disciplinado',
  })
  async notify(
    @Param('id') id: string,
    @Body() registerNotificationDto: RegisterNotificationDto,
  ): Promise<LegalAuto> {
    return await this.autoService.registerNotification(id, registerNotificationDto);
  }

  /**
   * Subir/reemplazar documento de un auto durante revisión (con control de versiones)
   */
  @Patch(':id/upload-document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reemplazar documento del auto durante revisión' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'autos');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `auto-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos PDF o Word'), false);
        }
      },
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('comentario') comentario: string,
    @Body('userId') userId: string,
  ): Promise<LegalAuto> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }
    const documentUrl = `/uploads/autos/${file.filename}`;
    return await this.autoService.uploadDocumentoDuranteRevision(
      id,
      documentUrl,
      file.originalname,
      file.mimetype,
      file.size,
      comentario,
      userId,
    );
  }

  /**
   * Obtener historial de versiones
   */
  @Get(':id/versions')
  @ApiOperation({
    summary: 'Obtener Versiones',
    description: 'Retorna el historial de cambios de un auto',
  })
  async getVersions(@Param('id') id: string) {
    return await this.autoService.getVersions(id);
  }

  /**
   * Eliminar auto
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar Auto',
    description: 'Elimina un auto legal por ID',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.autoService.delete(id);
  }

  /**
   * Descargar PDF (Generado desde HTML)
   */
  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Descargar PDF del Auto',
    description: 'Genera y descarga el PDF del auto (Visualización HTML por ahora)',
  })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const auto = await this.autoService.findById(id);

    // Por ahora retornamos HTML renderizable
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="Auto-${auto.numero || 'borrador'}.html"`);

    // Envolver en una estructura HTML básica para mejor visualización
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Auto ${auto.numero || 'Borrador'}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 30px; }
          .content { text-align: justify; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>REPÚBLICA DE COLOMBIA</h2>
          <h3>ESAP - CONTROL DISCIPLINARIO</h3>
        </div>
        <div class="content">
          ${auto.contenido || '<p>Sin contenido</p>'}
        </div>
      </body>
      </html>
    `;

    res.send(htmlContent);
  }

  /**
   * Descargar PDF de una Versión Específica
   */
  @Get(':id/versions/:version/pdf')
  @ApiOperation({
    summary: 'Descargar PDF de Versión',
    description: 'Genera PDF de una versión histórica',
  })
  async downloadVersionPdf(
    @Param('id') id: string,
    @Param('version') version: number,
    @Res() res: Response
  ) {
    const versionAuto = await this.autoService.getAutoVersionContent(id, Number(version));

    // Si la versión tiene archivo adjunto, REDIRIGIR a él (o servirlo)
    if (versionAuto.documentUrl) {
      // Opción A: Redirigir (Frontend hace fetch de esto)
      // return res.redirect(versionAuto.documentUrl); 
      // Opción B: Leer y devolver stream (más complejo si es S3/externo)
      // Como downloadUrl en frontend maneja fetch, lo ideal es que si es .pdf, el frontend lo reciba.
      // Si devolvemos redirect 302, el fetch lo sigue.
      return res.redirect(versionAuto.documentUrl);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="Auto-${id}-v${version}.html"`);

    // Envolver en una estructura HTML básica para mejor visualización
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Versión ${version}</title>
         <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.5; background-color: #f9f9f9; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .content { text-align: justify; background: #fff; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .meta { font-size: 0.8em; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>HISTÓRICO DE VERSIÓN ${version}</h2>
          <p>Este documento es una versión histórica y puede no reflejar el estado actual.</p>
        </div>
        <div class="content">
          ${versionAuto.contenido || '<p>Sin contenido registrado en esta versión</p>'}
        </div>
        <div class="meta">
            Registrado por: ${versionAuto.createdBy || 'Sistema'} <br>
            Razón: ${versionAuto.changeReason || 'N/A'} <br>
            Fecha: ${new Date(versionAuto.createdAt).toLocaleString()}
        </div>
      </body>
      </html>
    `;

    res.send(htmlContent);
  }

  /**
   * Obtener configuración de OnlyOffice para editar documento Word
   */
  @Get(':id/onlyoffice-config')
  @ApiOperation({
    summary: 'Configuración OnlyOffice',
    description: 'Obtiene la configuración necesaria para abrir el editor OnlyOffice',
  })
  async getOnlyOfficeConfig(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const auto = await this.autoService.findById(id);

    if (!auto.documentUrl) {
      throw new Error('Este auto no tiene un documento adjunto');
    }

    // Construir URL completa del documento
    // OnlyOffice corre en Docker y necesita acceder al backend usando el nombre del servicio Docker
    // auto.documentUrl ya es '/files/filename.docx'
    const backendUrl = process.env.BACKEND_URL || 'http://internal-disciplinary-control-service:3005';
    const documentUrl = `${backendUrl}${auto.documentUrl}`;

    // Generar clave única para el documento (ID + versión)
    const documentKey = `${auto.id}_v${auto.currentVersion || 1}`;

    const config = this.onlyOfficeService.generateConfig(
      documentUrl,
      documentKey,
      auto.documentName || 'documento.docx',
      userId || 'anonymous',
    );

    return config;
  }

  /**
   * Callback de OnlyOffice cuando se guarda el documento
   */
  @Post('onlyoffice/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Callback OnlyOffice',
    description: 'Recibe notificaciones de OnlyOffice cuando el documento es guardado',
  })
  async onlyOfficeCallback(@Body() body: any) {
    console.log('OnlyOffice callback recibido:', JSON.stringify(body, null, 2));

    // Status 2 = documento listo para guardar (todos los usuarios cerraron)
    // Status 3 = error al guardar
    // Status 6 = documento siendo editado
    if (body.status === 2) {
      try {
        let downloadUrl = body.url;
        const documentKey = body.key;

        // Extraer el autoId de la key (formato: autoId_vX_timestamp)
        const autoId = documentKey.split('_')[0];

        // OnlyOffice devuelve localhost:8080, pero desde Docker necesitamos usar el nombre del servicio
        downloadUrl = downloadUrl.replace('http://localhost:8080', 'http://onlyoffice:80');
        downloadUrl = downloadUrl.replace('https://localhost:8080', 'http://onlyoffice:80');

        console.log(`📥 Descargando documento actualizado para auto ${autoId} desde: ${downloadUrl}`);

        // Descargar el documento desde OnlyOffice
        const axios = require('axios');
        const fs = require('fs');
        const path = require('path');

        const response = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'arraybuffer',
        });

        // Obtener el auto actual para conocer el nombre del archivo
        const auto = await this.autoService.findById(autoId);

        if (auto && auto.documentUrl) {
          // Extraer el nombre del archivo de la URL existente
          const filename = auto.documentUrl.split('/').pop();
          const filePath = path.join(process.cwd(), 'uploads', filename);

          // Guardar el archivo actualizado
          fs.writeFileSync(filePath, response.data);

          console.log(`✅ Documento guardado exitosamente en: ${filePath}`);
        } else {
          console.log('⚠️ Auto no tiene documentUrl, no se puede actualizar');
        }
      } catch (error) {
        console.error('❌ Error guardando documento desde OnlyOffice:', error.message);
      }
    }

    // OnlyOffice espera una respuesta con { error: 0 } para indicar éxito
    return { error: 0 };
  }
}
