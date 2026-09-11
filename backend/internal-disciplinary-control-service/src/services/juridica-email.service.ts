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
  /**
   * Localiza un archivo del expediente en disco de forma recursiva y tolerante a
   * subcarpetas (año, radicado, expedientes, plantillas) y codificación URI.
   */
  private resolverRutaArchivo(referencia?: string | null): string | null {
    if (!referencia) return null;

    let limpia = referencia;
    if (/^https?:\/\//i.test(referencia)) {
      try {
        const urlObj = new URL(referencia);
        limpia = urlObj.pathname;
      } catch {
        limpia = referencia;
      }
    }

    limpia = limpia.replace(/^\/files\//, '').replace(/^\/+/, '');
    let decodedLimpia = limpia;
    try {
      decodedLimpia = decodeURIComponent(limpia);
    } catch {
      decodedLimpia = limpia;
    }

    const uploadsRoot = path.resolve(getUploadRootDir());
    const cwdUploads = path.resolve(process.cwd(), 'uploads');

    const posiblesDirectas = [
      this.storageService.getFullPath(limpia),
      this.storageService.getFullPath(decodedLimpia),
      path.resolve(uploadsRoot, limpia),
      path.resolve(uploadsRoot, decodedLimpia),
      path.resolve(cwdUploads, limpia),
      path.resolve(cwdUploads, decodedLimpia),
      path.resolve(process.cwd(), limpia),
      path.resolve(process.cwd(), decodedLimpia),
    ];

    for (const ruta of posiblesDirectas) {
      if (fs.existsSync(ruta)) {
        try {
          if (fs.statSync(ruta).isFile()) return ruta;
        } catch {
          // Continuar si falla stat
        }
      }
    }

    const nombreBase = path.basename(limpia);
    const decodedNombreBase = path.basename(decodedLimpia);
    const targets = Array.from(new Set([nombreBase, decodedNombreBase])).filter(Boolean);

    if (fs.existsSync(uploadsRoot)) {
      const encontrada = this.buscarArchivoRecursivo(uploadsRoot, targets, 4);
      if (encontrada) return encontrada;
    }

    if (cwdUploads !== uploadsRoot && fs.existsSync(cwdUploads)) {
      const encontrada = this.buscarArchivoRecursivo(cwdUploads, targets, 4);
      if (encontrada) return encontrada;
    }

    return null;
  }

  private buscarArchivoRecursivo(dir: string, targets: string[], maxDepth: number): string | null {
    if (maxDepth < 0) return null;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const decodedEntryName = (() => {
            try {
              return decodeURIComponent(entry.name);
            } catch {
              return entry.name;
            }
          })();
          if (targets.includes(entry.name) || targets.includes(decodedEntryName)) {
            return path.join(dir, entry.name);
          }
        }
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const res = this.buscarArchivoRecursivo(path.join(dir, entry.name), targets, maxDepth - 1);
          if (res) return res;
        }
      }
    } catch {
      // Ignorar errores de acceso a carpetas
    }
    return null;
  }

  private async leerAdjunto(
    referencia: string | null | undefined,
    nombreVisible: string,
    contentType?: string | null,
  ): Promise<EmailAdjunto | null> {
    try {
      // 1. Intentar resolver localmente en disco primero
      const ruta = this.resolverRutaArchivo(referencia);
      if (ruta) {
        const buffer = await fs.promises.readFile(ruta);
        return {
          filename: nombreVisible,
          contentBase64: buffer.toString('base64'),
          contentType: contentType || undefined,
        };
      }

      // 2. Si no está en disco y es URL externa (http/https), descargar vía HTTP
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

      this.logger.warn(`Adjunto no encontrado en disco ni accesible vía HTTP, se omite: ${referencia}`);
      return null;
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
    adjuntosNoticia: any[] = [],
  ): Promise<EmailAdjunto[]> {
    const adjuntos: EmailAdjunto[] = [];
    let totalBytes = 0;
    const candidatos: Array<{ ref: string | null; nombre: string; contentType?: string | null }> = [];

    for (const auto of autos) {
      const refArchivo = auto?.firmaUrl || auto?.documentUrl;
      if (refArchivo) {
        const ext = auto.documentType === 'application/pdf' || !auto.documentType || refArchivo.endsWith('.pdf') ? 'pdf' : 'docx';
        candidatos.push({
          ref: refArchivo,
          nombre: auto.documentName || `${auto.tipo || 'Auto'}-${auto.numero || auto.id}.${ext}`,
          contentType: auto.documentType || (ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        });
      } else if (auto?.contenido) {
        // Auto redactado directamente con contenido HTML en el editor
        const autoHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${auto.tipo || 'Auto'} - ${auto.numero || ''}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; color: #111827; }
    h1, h2, h3 { color: #1e3a8a; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; }
  </style>
</head>
<body>
  ${auto.contenido}
</body>
</html>`;
        const autoBuffer = Buffer.from(autoHtml, 'utf-8');
        const bytes = autoBuffer.length;
        if (totalBytes + bytes <= MAX_ADJUNTOS_BYTES) {
          totalBytes += bytes;
          const cleanTipo = (auto.tipo || 'Auto').replace(/[^a-zA-Z0-9_-]/g, '_');
          adjuntos.push({
            filename: `${cleanTipo}-${auto.numero || auto.id}.html`,
            contentBase64: autoBuffer.toString('base64'),
            contentType: 'text/html',
          });
        }
      }
    }

    for (const ev of evidencias) {
      const ref = ev?.archivoUrl || ev?.url || ev?.filename || null;
      if (!ref) continue;
      candidatos.push({
        ref,
        nombre: ev.nombreDocumento || ev.nombreArchivo || ev.filename || 'Documento.pdf',
        contentType: ev.fileType || null,
      });
    }

    for (const adj of adjuntosNoticia) {
      if (!adj) continue;
      const ref = typeof adj === 'string' ? adj : (adj?.url || adj?.path || adj?.filename || null);
      if (!ref) continue;
      const nombre = typeof adj === 'object' && adj?.nombre ? adj.nombre : path.basename(ref);
      candidatos.push({ ref, nombre, contentType: null });
    }

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
