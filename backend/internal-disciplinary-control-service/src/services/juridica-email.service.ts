import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService, getUploadRootDir } from './storage.service';

export interface EmailAdjunto {
  filename: string;
  contentBase64: string;
  contentType?: string;
}

// Tope total de adjuntos por correo (SMTP/Graph rechazan mensajes muy grandes).
const MAX_ADJUNTOS_BYTES = 20 * 1024 * 1024;
// Timeout para descargar un adjunto alojado en una URL externa.
const DESCARGA_EXTERNA_TIMEOUT_MS = 15000;

@Injectable()
export class JuridicaEmailService {
  private readonly logger = new Logger(JuridicaEmailService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Envía correo a la oficina de jurídica usando el notifications-service.
   * POST http://notifications-service:3009/api/v1/emails/send
   */
  async enviarCorreoJuridica(
    processId: string,
    datosConsolidados: {
      radicado: string;
      etapaAlCierre: string;
      profesionalResponsable: string;
      fechaCreacion: string;
      fechaCierre: string;
      fechaVencimiento: string;
      disciplinable: any;
      hechos: string;
      autosGenerados: number;
      historialEtapas: string;
      enviadoPorNombre?: string;
      profesionalEmail?: string;
      enviadoPorEmail?: string;
    },
    adjuntos: EmailAdjunto[] = [],
  ): Promise<boolean> {
    const destinatario = process.env.JURIDICA_EMAIL || 'juridica@esap.edu.co';
    // Soporte para ambos nombres de variable de entorno
    const notificationsUrl =
      process.env.NOTIFICATIONS_SERVICE_URL ||
      process.env.NOTIFICATION_SERVICE_URL ||
      'http://localhost:3009';

    const disciplinable = datosConsolidados.disciplinable || {};
    const nombreDisciplinable = disciplinable.nombre || disciplinable.nombreCompleto || 'No registrado';
    const identificacionDisciplinable = disciplinable.cedula || disciplinable.identificacion || 'No registrado';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .header { background: #003DA5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table td { padding: 8px 12px; border: 1px solid #ddd; }
          .info-table td:first-child { background: #F3F4F6; font-weight: bold; width: 200px; }
          .footer { background: #F9FAFB; padding: 15px 20px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .badge-cerrado { background: #FEF3C7; color: #92400E; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>ESCUELA SUPERIOR DE ADMINISTRACI&Oacute;N P&Uacute;BLICA - ESAP</h2>
          <h3>Oficina de Control Interno Disciplinario</h3>
          <p>Traslado de Proceso por Auto Pliego de Cargos</p>
        </div>
        <div class="content">
          <p>Estimada Oficina Jur&iacute;dica,</p>
          <p>Se informa que el siguiente proceso disciplinario ha sido <strong>cerrado</strong> mediante Auto Pliego de Cargos y se traslada a su despacho para la continuaci&oacute;n del tr&aacute; mite correspondiente.</p>

          <h3>Informaci&oacute;n del Proceso</h3>
          <table class="info-table">
            <tr><td>Radicado</td><td><strong>${datosConsolidados.radicado}</strong></td></tr>
            <tr><td>Estado</td><td><span class="badge badge-cerrado">CERRADO</span></td></tr>
            <tr><td>Etapa al momento del cierre</td><td>${datosConsolidados.etapaAlCierre}</td></tr>
            <tr><td>Profesional responsable</td><td>${datosConsolidados.profesionalResponsable}</td></tr>
            <tr><td>Fecha de apertura</td><td>${datosConsolidados.fechaCreacion}</td></tr>
            <tr><td>Fecha de cierre</td><td>${datosConsolidados.fechaCierre}</td></tr>
            <tr><td>Fecha de vencimiento</td><td>${datosConsolidados.fechaVencimiento}</td></tr>
            <tr><td>Autos generados</td><td>${datosConsolidados.autosGenerados}</td></tr>
          </table>

          <h3>Datos del Disciplinable</h3>
          <table class="info-table">
            <tr><td>Nombre</td><td>${nombreDisciplinable}</td></tr>
            <tr><td>Identificaci&oacute;n</td><td>${identificacionDisciplinable}</td></tr>
          </table>

          <h3>Hechos</h3>
          <div style="background: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB;">
            ${datosConsolidados.hechos || '<em>No registrados</em>'}
          </div>

          <p style="margin-top: 20px;">
            <strong>Nota:</strong> ${
              adjuntos.length > 0
                ? `Se anexan a este correo ${adjuntos.length} documento(s) del expediente. `
                : ''
            }El expediente completo del proceso se encuentra disponible en el Sistema Integrado de Gesti&oacute;n Legal (SIGL) de la ESAP.
          </p>
        </div>
        <div class="footer">
          <p>Este correo fue generado autom&aacute;ticamente por el m&oacute;dulo de Control Disciplinario del SIGL - ESAP.</p>
          <p>Fecha de env&iacute;o: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
        </div>
      </body>
      </html>
    `;

    try {
      await firstValueFrom(
        this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
          to: destinatario,
          subject: `[PLIEGO DE CARGOS] Proceso ${datosConsolidados.radicado} - Traslado a Oficina Jurídica`,
          html,
          ...(adjuntos.length > 0 && { attachments: adjuntos }),
        }),
      );

      this.logger.log(
        `Correo enviado a jurídica para proceso ${processId} vía notifications-service (${adjuntos.length} adjunto(s))`,
      );
      return true;
    } catch (error: any) {
      const errorDetails = {
        message: error?.message,
        status: error?.response?.status,
        responseData: error?.response?.data,
        code: error?.code,
        url: `${notificationsUrl}/api/v1/emails/send`,
        to: destinatario,
      };
      this.logger.error(
        `Error al enviar correo para proceso ${processId}: ${JSON.stringify(errorDetails, null, 2)}`,
      );
      console.error('[JuridicaEmailService] Full error object:', error);
      return false;
    }
  }

  /**
   * Localiza un archivo del expediente en disco. Reproduce el resolvedor de
   * process.controller.ts::downloadDocument (getFullPath + búsqueda en
   * subcarpetas por año/radicado).
   */
  private resolverRutaArchivo(referencia?: string | null): string | null {
    if (!referencia) return null;
    const limpia = referencia.replace(/^\/files\//, '').replace(/^\/+/, '');
    const rutaDirecta = this.storageService.getFullPath(limpia);
    if (fs.existsSync(rutaDirecta)) return rutaDirecta;

    const nombreBase = path.basename(limpia);
    const uploadsRoot = path.resolve(getUploadRootDir());
    if (!nombreBase || !fs.existsSync(uploadsRoot)) return null;

    for (const entrada of fs.readdirSync(uploadsRoot, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;
      const nivel1 = path.join(uploadsRoot, entrada.name, nombreBase);
      if (fs.existsSync(nivel1)) return nivel1;
      const dirNivel1 = path.join(uploadsRoot, entrada.name);
      for (const sub of fs.readdirSync(dirNivel1, { withFileTypes: true })) {
        if (!sub.isDirectory()) continue;
        const nivel2 = path.join(dirNivel1, sub.name, nombreBase);
        if (fs.existsSync(nivel2)) return nivel2;
      }
    }
    return null;
  }

  private async leerAdjunto(
    referencia: string | null | undefined,
    nombreVisible: string,
    contentType?: string | null,
  ): Promise<EmailAdjunto | null> {
    try {
      // URL externa (http/https): descargar por HTTP.
      if (referencia && /^https?:\/\//i.test(referencia)) {
        const resp = await firstValueFrom(
          this.httpService.get(referencia, {
            responseType: 'arraybuffer',
            timeout: DESCARGA_EXTERNA_TIMEOUT_MS,
          }),
        );
        return {
          filename: nombreVisible,
          contentBase64: Buffer.from(resp.data).toString('base64'),
          contentType:
            contentType || (resp.headers as any)?.['content-type'] || undefined,
        };
      }

      const ruta = this.resolverRutaArchivo(referencia);
      if (!ruta) {
        this.logger.warn(`Adjunto no encontrado en disco, se omite del correo: ${referencia}`);
        return null;
      }
      const buffer = await fs.promises.readFile(ruta);
      return {
        filename: nombreVisible,
        contentBase64: buffer.toString('base64'),
        contentType: contentType || undefined,
      };
    } catch (e: any) {
      this.logger.warn(`No se pudo leer el adjunto "${nombreVisible}": ${e?.message}`);
      return null;
    }
  }

  /**
   * Recolecta todos los documentos del expediente (autos aprobados/firmados/
   * notificados + evidencias + adjuntos de la noticia) como adjuntos base64,
   * respetando un tope de tamaño total. Nunca lanza: lo que no se puede leer se
   * omite con un warning para no romper el envío a Jurídica.
   */
  async recolectarAdjuntosExpediente(
    evidencias: any[] = [],
    autos: any[] = [],
    adjuntosNoticia: string[] = [],
  ): Promise<EmailAdjunto[]> {
    const candidatos: Array<{ ref: string | null; nombre: string; contentType?: string | null }> = [];

    for (const auto of autos) {
      if (!auto?.documentUrl) continue; // autos solo-HTML no tienen archivo físico
      const ext = auto.documentType === 'application/pdf' || !auto.documentType ? 'pdf' : 'docx';
      candidatos.push({
        ref: auto.documentUrl,
        nombre: auto.documentName || `${auto.tipo || 'Auto'}-${auto.numero || auto.id}.${ext}`,
        contentType: auto.documentType || 'application/pdf',
      });
    }

    for (const ev of evidencias) {
      const ref = ev?.url || ev?.archivoUrl || ev?.filename || null;
      if (!ref) continue;
      candidatos.push({
        ref,
        nombre: ev.nombreDocumento || ev.filename || ev.nombreArchivo || 'Documento.pdf',
        contentType: ev.fileType || null,
      });
    }

    for (const adj of adjuntosNoticia) {
      if (!adj) continue;
      candidatos.push({ ref: adj, nombre: path.basename(adj), contentType: null });
    }

    const adjuntos: EmailAdjunto[] = [];
    let totalBytes = 0;
    for (const c of candidatos) {
      const leido = await this.leerAdjunto(c.ref, c.nombre, c.contentType);
      if (!leido) continue;
      const bytes = Math.ceil((leido.contentBase64.length * 3) / 4);
      if (totalBytes + bytes > MAX_ADJUNTOS_BYTES) {
        this.logger.warn(
          `Se alcanzó el tope de tamaño de adjuntos (${MAX_ADJUNTOS_BYTES} bytes); ` +
            `"${c.nombre}" y los siguientes se omiten del correo.`,
        );
        break;
      }
      totalBytes += bytes;
      adjuntos.push(leido);
    }
    return adjuntos;
  }

  /**
   * Envía notificación por correo al profesional asignado y al jefe que envía el proceso a Jurídica.
   * Usa el mensaje solicitado: "el proceso con consecutivo .... ha sido enviado a juridica, por el jefe --> nombre..."
   */
  async enviarNotificacionEnvioAJuridica(
    processId: string,
    radicado: string,
    nombreJefe: string,
    emailProfesional?: string,
    emailJefe?: string,
  ): Promise<void> {
    const notificationsUrl =
      process.env.NOTIFICATIONS_SERVICE_URL ||
      process.env.NOTIFICATION_SERVICE_URL ||
      'http://localhost:3009';

    const destinatarios = [emailProfesional, emailJefe].filter((e): e is string => !!e);
    if (destinatarios.length === 0) {
      this.logger.warn(`No hay emails para notificar envío a jurídica del proceso ${radicado}`);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .header { background: #003DA5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #F9FAFB; padding: 15px 20px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; background: #FEF3C7; color: #92400E; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>ESCUELA SUPERIOR DE ADMINISTRACI&Oacute;N P&Uacute;BLICA - ESAP</h2>
          <h3>Oficina de Control Interno Disciplinario</h3>
        </div>
        <div class="content">
          <p>Estimado(a),</p>
          <p>El proceso con consecutivo <strong>${radicado}</strong> ha sido enviado a Jur&iacute;dica, por el jefe <strong>${nombreJefe}</strong>.</p>
          <p>Este correo es una notificaci&oacute;n informativa del cierre y traslado del proceso.</p>
        </div>
        <div class="footer">
          <p>Este correo fue generado autom&aacute;ticamente por el m&oacute;dulo de Control Disciplinario del SIGL - ESAP.</p>
          <p>Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
        </div>
      </body>
      </html>
    `;

    const uniqueDest = Array.from(new Set(destinatarios));
    for (const to of uniqueDest) {
      try {
        await firstValueFrom(
          this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
            to,
            subject: `[ENVÍO A JURÍDICA] Proceso ${radicado} - Enviado por ${nombreJefe}`,
            html,
          }),
        );
        this.logger.log(`Notificación de envío a jurídica enviada a ${to} para proceso ${radicado}`);
      } catch (error: any) {
        const errorDetails = {
          message: error?.message,
          status: error?.response?.status,
          responseData: error?.response?.data,
          url: `${notificationsUrl}/api/v1/emails/send`,
          to,
        };
        this.logger.error(
          `Error enviando notificación a ${to} para proceso ${radicado}: ${JSON.stringify(errorDetails)}`,
        );
        console.error('[JuridicaEmailService] Full error on internal notification:', error);
      }
    }
  }
}
