import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
  Req,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CompartirExpedienteService } from '../services/compartir-expediente.service';
import { CrearCompartidoDto, AccederCompartidoDto } from '../dtos/compartir-expediente.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';
import { EstadoCompartido } from '../entities/expediente-compartido.entity';
import type { Request as ExpressRequest, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
import { AutoService } from '../services/auto.service';
import * as fs from 'fs';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('compartir-expediente')
export class CompartirExpedienteController {
  constructor(
    private readonly compartirService: CompartirExpedienteService,
    private readonly processService: ProcessService,
    private readonly storageService: StorageService,
    private readonly autoService: AutoService,
    private httpService: HttpService,
  ) {}

  /**
   * Obtener la URL base del frontend desde los headers
   * Sigue el mismo patrón que graduation-certificates.controller
   */
  private getFrontendBaseUrl(req: ExpressRequest): string | undefined {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }
    return frontendBaseUrl;
  }

  /**
   * Crear un nuevo enlace compartido
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
  @Post(':procesoId')
  async crearCompartido(
    @Param('procesoId') procesoId: string,
    @Body() dto: CrearCompartidoDto,
    @Request() req: any,
    @Req() expressReq: ExpressRequest,
  ) {
    const usuarioId = req.user?.id;
    const compartido = await this.compartirService.crearCompartido(procesoId, dto, usuarioId);

    // Determinar la URL base del frontend:
    // 1. Primero: usar la URL proporcionada directamente por el cliente (prioridad más alta)
    // 2. Segundo: intentar obtener desde los headers (origin/referer)
    // 3. Tercero: usar variables de entorno del backend
    const frontendBaseUrl = dto.frontendBaseUrl || this.getFrontendBaseUrl(expressReq);
    const urlExpediente = this.compartirService.generarUrlPublica(compartido.tokenAcceso, frontendBaseUrl);

    // Si es tipo EMAIL, enviar el correo con el enlace
    if (dto.tipoCompartido === 'EMAIL' && dto.emailDestinatario) {
      try {
        const notificationsServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009';
        console.log('📧 [CompartirExpediente] URL del servicio de notificaciones:', notificationsServiceUrl);

        // Construir contenido HTML del correo
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2962FF;">📋 Expediente Compartido - Control Disciplinario ESAP</h2>
            <p>Se ha compartido un expediente disciplinario con usted.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Enlace de acceso:</strong></p>
              <a href="${urlExpediente}" style="color: #2962FF; font-size: 16px;">${urlExpediente}</a>
            </div>
            ${dto.requiereClave && dto.clave ? `
              <p><strong>Clave de acceso:</strong> ${dto.clave}</p>
            ` : ''}
            ${dto.mensajeAdicional ? `
              <p><strong>Mensaje adicional:</strong></p>
              <p>${dto.mensajeAdicional}</p>
            ` : ''}
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Este enlace fue generado por el Sistema de Gestión Integral de la ESAP.
              ${compartido.tiempoExpiracionHoras ? ` | Expira en ${compartido.tiempoExpiracionHoras} horas.` : ''}
            </p>
          </div>
        `;

        const emailPayload = {
          to: dto.emailDestinatario,
          subject: `📋 Expediente Compartido - ESAP Control Disciplinario`,
          text: `Se ha compartido un expediente disciplinario con usted.\n\nEnlace: ${urlExpediente}${dto.requiereClave && dto.clave ? `\nClave: ${dto.clave}` : ''}`,
          html: emailHtml,
        };

        console.log('📧 [CompartirExpediente] Enviando correo a:', dto.emailDestinatario);

        const response = await firstValueFrom(
          this.httpService.post(`${notificationsServiceUrl}/api/v1/emails/send`, emailPayload),
        );

        console.log('📧 [CompartirExpediente] Correo enviado exitosamente:', response.data);
      } catch (error) {
        console.error('❌ [CompartirExpediente] Error al enviar correo:', error);
        // No fallamos la operación si el correo falla, pero registramos el error
      }
    }

    return {
      id: compartido.id,
      token: compartido.tokenAcceso,
      url: urlExpediente,
      urlQR: this.compartirService.generarUrlQR(compartido.tokenAcceso, frontendBaseUrl),
      tipoCompartido: compartido.tipoCompartido,
      requiereClave: compartido.requiereClave,
      tiempoExpiracionHoras: compartido.tiempoExpiracionHoras,
      fechaExpiracion: compartido.fechaExpiracion,
      emailDestinatario: compartido.emailDestinatario,
      createdAt: compartido.createdAt,
    };
  }

  /**
   * Listar todos los enlaces compartidos de un proceso
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
  @Get('proceso/:procesoId')
  async listarPorProceso(@Param('procesoId') procesoId: string) {
    const enlaces = await this.compartirService.listarPorProceso(procesoId);
    return enlaces.map((enlace) => ({
      id: enlace.id,
      token: enlace.tokenAcceso.substring(0, 8) + '...',
      tipoCompartido: enlace.tipoCompartido,
      estado: enlace.estado,
      requiereClave: enlace.requiereClave,
      tiempoExpiracionHoras: enlace.tiempoExpiracionHoras,
      fechaExpiracion: enlace.fechaExpiracion,
      contadorAccesos: enlace.contadorAccesos,
      ultimoAcceso: enlace.ultimoAcceso,
      createdAt: enlace.createdAt,
    }));
  }

  /**
   * Desactivar un enlace compartido
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
  @Post(':id/desactivar')
  async desactivar(@Param('id') id: string) {
    const enlace = await this.compartirService.desactivar(id);
    return {
      id: enlace.id,
      estado: enlace.estado,
      message: 'Enlace compartido desactivado exitosamente',
    };
  }

  /**
   * Verificar acceso a un enlace compartido (público)
   * Cambiado a GET para evitar problemas con autenticación
   */
  @Public()
  @Get('verificar/:token')
  async verificarAcceso(
    @Param('token') token: string,
    @Query('clave') clave: string,
    @Ip() ip: string,
  ) {
    return this.compartirService.verificarAcceso({ token, clave }, ip);
  }

  /**
   * Obtener datos públicos del expediente compartido (sin autenticación)
   * Este endpoint es público y retorna información básica del proceso
   */
  @Public()
  @Get('publico/:token')
  async obtenerExpedientePublico(
    @Param('token') token: string,
    @Req() req: ExpressRequest,
  ) {
    const frontendBaseUrl = this.getFrontendBaseUrl(req);
    return this.compartirService.obtenerExpedientePublico(token, frontendBaseUrl);
  }

  /**
   * Obtener documentos públicos del expediente compartido (sin autenticación)
   * Retorna la lista de documentos disponibles para el expediente compartido
   */
  @Public()
  @Get('documentos/:token')
  async obtenerDocumentosPublicos(@Param('token') token: string) {
    console.log('📄 [CompartirExpediente] obtenerDocumentosPublicos called with token:', token);

    // Verificar que el token de compartido sea válido
    const compartido = await this.compartirService.obtenerPorToken(token);

    if (!compartido) {
      throw new NotFoundException('Enlace no encontrado');
    }

    if (compartido.estado !== EstadoCompartido.ACTIVO) {
      throw new ForbiddenException('Este enlace ya no está activo');
    }

    if (compartido.fechaExpiracion && new Date() > compartido.fechaExpiracion) {
      throw new ForbiddenException('Este enlace ha expirado');
    }

    // Obtener documentos del proceso
    const documentos = await this.processService.getEvidenceByProcessId(compartido.procesoId);
    
    // Obtener el proceso con sus autos
    const proceso = await this.processService.findById(compartido.procesoId, true);

    // Filtrar autos procesales aprobados/firmados/notificados
    const autosAprobados = (proceso.autos || []).filter((auto: any) =>
      ['APROBADO', 'FIRMADO', 'NOTIFICADO'].includes(auto.estado)
    );

    // Mapear evidencias al formato esperado por el frontend
    const documentosMapeados = documentos.map(doc => ({
      id: doc.id,
      nombre: doc.documentName || doc.filename || 'Documento sin nombre',
      tipo: doc.documentType || 'Documento',
      etapa: doc.etapa || 'Sin etapa',
      version: doc.version || 1,
      tamaño: doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Tamaño desconocido',
      fechaCarga: doc.createdAt || doc.fechaCarga || new Date().toISOString(),
      usuarioCarga: doc.usuarioCarga || 'Sistema',
      descripcion: doc.description || '',
      url: doc.url,
      urlExterna: doc.urlExterna,
      downloadUrl: `/compartir-expediente/documento/${token}/${doc.id}/download`,
      metadatos: {
        firmado: doc.metadatos?.firmado || false,
        notificado: doc.metadatos?.notificado || false,
        folios: doc.metadatos?.folios || 0,
      },
    }));

    // Mapear autos procesales a documentos del expediente
    const documentosAutos = autosAprobados.map((auto: any) => {
      const sizeBytes = auto.documentSize || new TextEncoder().encode(auto.contenido || '').length;
      const tamaño = sizeBytes >= 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.max(1, (sizeBytes / 1024)).toFixed(0)} KB`;

      return {
        id: auto.id,
        nombre: `${auto.tipo || 'Auto'} ${auto.numero || ''}`.trim(),
        tipo: 'auto',
        etapa: auto.etapa || 'Sin etapa',
        version: auto.currentVersion || 1,
        tamaño,
        fechaCarga: auto.createdAt?.toISOString() || new Date().toISOString(),
        usuarioCarga: auto.usuarioCarga || 'Sistema',
        descripcion: auto.asunto || '',
        url: null,
        urlExterna: null,
        downloadUrl: `/compartir-expediente/documento/${token}/${auto.id}/download`,
        processId: compartido.procesoId,
        fileType: auto.documentUrl ? (auto.documentType || 'application/pdf') : 'text/html',
        archivoNombre: auto.documentName || `Auto-${auto.numero || 'borrador'}.${auto.documentUrl ? 'pdf' : 'html'}`,
        fileSize: auto.documentSize || sizeBytes,
        versiones: [
          {
            numero: auto.currentVersion || 1,
            fecha: auto.updatedAt || auto.createdAt,
            usuario: 'Usuario Actual',
            cambios: 'Versión Actual',
            tamaño: sizeBytes >= 1024 * 1024
              ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
              : `${Math.max(1, (sizeBytes / 1024)).toFixed(0)} KB`,
            downloadUrl: `/compartir-expediente/documento/${token}/${auto.id}/download`
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
              downloadUrl: `/compartir-expediente/documento/${token}/${auto.id}/download`
            };
          })],
        contenido: auto.contenido,
        metadatos: {
          firmado: auto.estado === 'FIRMADO' || auto.estado === 'NOTIFICADO',
          notificado: auto.estado === 'NOTIFICADO',
          esAutoDigital: true,
          estado: auto.estado,
          tipoAuto: auto.tipo,
          numero: auto.numero
        },
      };
    });

    // Combinar y ordenar por fecha
    const todosDocumentos = [...documentosMapeados, ...documentosAutos].sort((a, b) => {
      return new Date(b.fechaCarga).getTime() - new Date(a.fechaCarga).getTime();
    });


    return {
      proceso: {
        id: compartido.procesoId,
        radicadoProceso: compartido.proceso?.radicadoProceso || 'Sin radicado',
      },
      documentos: todosDocumentos,
    };

  }

  /**
   * Página pública para ver el expediente compartido
   * Este endpoint devuelve los datos necesarios para renderizar la página pública
   */
  @Public()
  @Get('vista/:token')
  async obtenerVistaPublica(
    @Param('token') token: string,
    @Req() req: ExpressRequest,
  ) {
    const frontendBaseUrl = this.getFrontendBaseUrl(req);
    return this.compartirService.obtenerExpedientePublico(token, frontendBaseUrl);
  }

  /**
   * Descargar documento público de expediente compartido (sin autenticación)
   * Verifica que el token de compartido sea válido y permite descarga si está habilitada
   */
  @Public()
  @Get('documento/:token/:documentId/download')
  async descargarDocumentoPublico(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Query('view') view: string,
    @Res() res: Response,
  ) {
    try {
      // Verificar que el token de compartido sea válido
      const compartido = await this.compartirService.obtenerPorToken(token);

      if (!compartido) {
        return res.status(404).json({ error: 'Enlace no encontrado' });
      }

      if (compartido.estado !== EstadoCompartido.ACTIVO) {
        return res.status(403).json({ error: 'Este enlace ya no está activo' });
      }

      if (compartido.fechaExpiracion && new Date() > compartido.fechaExpiracion) {
        return res.status(403).json({ error: 'Este enlace ha expirado' });
      }

      // Verificar si permite descarga
      if (!compartido.permiteDescarga) {
        return res.status(403).json({ error: 'La descarga no está permitida para este enlace' });
      }

      // Verificar que el documento pertenezca al proceso compartido
      const documentos = await this.processService.getEvidenceByProcessId(compartido.procesoId);
      let documento: any = documentos.find(d => d.id === documentId);

      if (!documento) {
        // Buscar en autos antes de retornar 404
        try {
          const auto = await this.autoService.findById(documentId, []);
          if (auto) {
            const autoUrl = auto.documentUrl ? auto.documentUrl.replace(/^\/files\//, '') : null;
            documento = { url: autoUrl, filename: auto.documentName, nombreDocumento: auto.documentName, fileType: auto.documentType };
          }
        } catch (_) {}
      }

      if (!documento) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      // Si es una URL externa, redirigir
      const isUrlExterna = documento.url && (documento.url.startsWith('http://') || documento.url.startsWith('https://'));
      if (isUrlExterna) {
        return res.redirect(documento.url);
      }

      // Obtener ruta completa del archivo
      const rutaCompleta = this.storageService.getFullPath(documento.url);

      // Verificar que el archivo existe
      if (!fs.existsSync(rutaCompleta)) {
        return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
      }

      // Obtener nombre del archivo
      const nombreArchivo = documento.filename || documento.nombreDocumento || 'documento';

      // Configurar headers según si es vista o descarga
      if (view === 'true') {
        // Vista inline
        const mimeType = documento.fileType || 'application/octet-stream';
        const encodedFilename = encodeURIComponent(nombreArchivo);
        const filenameStar = `filename*=UTF-8''${encodedFilename}`;

        res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
        res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"; ${filenameStar}`);
      } else {
        // Descarga
        const encodedFilename = encodeURIComponent(nombreArchivo);
        const filenameStar = `filename*=UTF-8''${encodedFilename}`;

        res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"; ${filenameStar}`);
      }

      // Enviar archivo
      const fileStream = fs.createReadStream(rutaCompleta);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error al descargar documento público:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
