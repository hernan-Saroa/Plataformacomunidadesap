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
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AutoService } from '../services/auto.service';
import {
  CreateLegalAutoDto,
} from '../dtos/create-legal-auto.dto';
import { ReviewAutoDto } from '../dtos/review-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';
import { LegalAuto } from '../entities/legal-auto.entity';

@ApiTags('Autos Legales')
@Controller('disciplinary-autos')
export class AutoController {
  constructor(private autoService: AutoService) { }

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
      documentUrl: undefined,
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
    @Query('userId') userId: string, // Simplificación para demo
  ): Promise<LegalAuto> {
    if (!userId) throw new Error('UserId requerido para firma');
    return await this.autoService.sign(id, userId);
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
}
