import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DisciplinaryEmailService {
  private readonly logger = new Logger(DisciplinaryEmailService.name);

  constructor(private readonly httpService: HttpService) {}

  private getFrontendBaseUrl(): string {
    return (
      process.env.PUBLIC_APP_URL ||
      process.env.PUBLIC_FRONTEND_URL ||
      process.env.FRONTEND_URL ||
      process.env.FRONTEND_BASE_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  /**
   * Envía un correo directo a un profesional cuando un proceso le es reasignado
   */
  async sendReassignmentEmail(
    to: string,
    profesionalNombre: string,
    radicadoProceso: string,
    justificacion: string,
    observacionesJefe?: string,
  ): Promise<boolean> {
    const notificationsUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3009';
    const baseUrl = this.getFrontendBaseUrl();
    const urlAcceso = `${baseUrl}/?module=control-disciplinario&radicado=${encodeURIComponent(radicadoProceso)}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #003DA5 0%, #2563EB 100%); color: white; padding: 32px 24px; text-align: center; }
          .content { padding: 32px; }
          .info-box { background-color: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #f3f4f6; }
          .footer { background-color: #f9fafb; padding: 24px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px;">Control Interno Disciplinario</h1>
            <p style="margin:8px 0 0 0; opacity: 0.9;">Notificación de Reasignación</p>
          </div>
          <div class="content">
            <h2 style="margin-top:0; color: #111827;">Hola, ${profesionalNombre}</h2>
            <p>Se te ha reasignado formalmente un nuevo proceso disciplinario en la plataforma SIGL-ESAP.</p>
            
            <div class="info-box">
              <p style="margin-top:0;"><strong>Radicado del Proceso:</strong><br><span style="color: #003DA5; font-size: 18px; font-weight: 700;">${radicadoProceso}</span></p>
              <p><strong>Justificación:</strong><br>${justificacion}</p>
              ${observacionesJefe ? `<p><strong>Observaciones del Jefe:</strong><br>${observacionesJefe}</p>` : ''}
            </div>
            
            <p>Por favor, ingresa a la plataforma para revisar los detalles del expediente y continuar con el trámite correspondiente.</p>
            
            <div style="text-align: center; margin-top: 26px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto; border-collapse: separate;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #003DA5;">
                    <a href="${urlAcceso}" target="_blank" rel="noopener noreferrer" style="background-color: #003DA5; border: 1px solid #002D7A; border-radius: 6px; color: #ffffff !important; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; line-height: 42px; text-align: center; text-decoration: none !important; -webkit-text-size-adjust: none; padding: 0 28px;">
                      <span style="color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none !important; display: inline-block;">
                        Ir a la Plataforma &rarr;
                      </span>
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #64748B; text-align: center; line-height: 1.4;">
                Si el botón no abre directamente, copie y pegue este enlace en su navegador:<br>
                <a href="${urlAcceso}" target="_blank" rel="noopener noreferrer" style="color: #003DA5; font-size: 11px; text-decoration: underline; word-break: break-all;">${urlAcceso}</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p><strong>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</strong><br>Oficina de Control Interno Disciplinario</p>
            <p style="margin-top: 8px;">Este correo fue generado automáticamente. Por favor no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await firstValueFrom(
        this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
          to,
          subject: `[REASIGNACIÓN] Nuevo proceso asignado: ${radicadoProceso}`,
          html,
        }),
      );
      this.logger.log(`Email de reasignación enviado exitosamente a ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error enviando email de reasignación a ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Envía un correo genérico con template HTML
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<boolean> {
    const notificationsUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3009';
    try {
      await firstValueFrom(
        this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
          to,
          subject,
          html,
          ...(text ? { text } : {}),
        }),
      );
      this.logger.log(`Email enviado exitosamente a ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error enviando email a ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Construye el template HTML institucional ESAP para avisos y notificaciones
   */
  buildEmailTemplateESAP(
    titulo: string,
    mensajePrincipal: string,
    detalles: Array<{ label: string; valor: string }>,
    badge: string = 'Aviso',
    badgeBg: string = '#003DA5',
    accionesRequeridas?: string,
    urlAcceso?: string,
    textoBoton: string = 'Ingresar a la Plataforma',
  ): string {
    const baseUrl = this.getFrontendBaseUrl();
    const finalUrlAcceso = urlAcceso || `${baseUrl}/?module=control-disciplinario`;

    const filasDetalle = detalles
      .map(
        (d) => `
        <tr>
          <td style="padding: 10px 14px; font-weight: 600; color: #374151; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; width: 38%; font-size: 13px;">${d.label}</td>
          <td style="padding: 10px 14px; color: #1f2937; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${d.valor}</td>
        </tr>`,
      )
      .join('');

    const seccionAcciones = accionesRequeridas
      ? `
      <div style="margin-top: 20px; padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Acciones Requeridas</p>
        <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.5;">${accionesRequeridas}</p>
      </div>`
      : '';

    return `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);">
            <tr>
              <td style="background-image:linear-gradient(135deg,#001A6E 0%,#003DA5 100%);background-color:#001A6E;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#60A5FA;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td>
                        <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">ESAP</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.85);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;font-weight:600;">Control Interno Disciplinario</div>
                      </td>
                      <td align="right">
                        <span style="background-color:${badgeBg};color:#ffffff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.3px;display:inline-block;">${badge}</span>
                      </td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 14px 0;font-size:19px;font-weight:700;color:#111827;line-height:1.4;">${titulo}</h1>
                <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;line-height:1.6;">${mensajePrincipal}</p>

                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:collapse;">
                  ${filasDetalle}
                </table>

                ${seccionAcciones}

                <div style="text-align: center; margin-top: 26px;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto; border-collapse: separate;">
                    <tr>
                      <td align="center" style="border-radius: 6px; background-color: #003DA5;">
                        <a href="${finalUrlAcceso}" target="_blank" rel="noopener noreferrer" style="background-color: #003DA5; border: 1px solid #002D7A; border-radius: 6px; color: #ffffff !important; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; line-height: 42px; text-align: center; text-decoration: none !important; -webkit-text-size-adjust: none; padding: 0 28px;">
                          <span style="color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none !important; display: inline-block;">
                            ${textoBoton} &rarr;
                          </span>
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 12px 0 0 0; font-size: 11px; color: #64748B; text-align: center; line-height: 1.4;">
                    Si el botón no abre directamente, copie y pegue este enlace en su navegador:<br>
                    <a href="${finalUrlAcceso}" target="_blank" rel="noopener noreferrer" style="color: #003DA5; font-size: 11px; text-decoration: underline; word-break: break-all;">${finalUrlAcceso}</a>
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">ESAP — Escuela Superior de Administración Pública &bull; Oficina de Control Interno Disciplinario</p>
                <p style="margin:4px 0 0 0;font-size:11px;color:#cbd5e1;text-align:center;">Este correo fue generado automáticamente. Por favor no responder.</p>
              </td>
            </tr>
          </table>
        </td></tr></table>
      </div>
    `;
  }

  /**
   * Envía un aviso por correo a múltiples destinatarios
   */
  async sendBulkNotification(
    destinatarios: Array<{ email: string; nombre?: string }>,
    asunto: string,
    titulo: string,
    mensajePrincipal: string,
    detalles: Array<{ label: string; valor: string }>,
    badge: string = 'Aviso',
    badgeBg: string = '#003DA5',
    accionesRequeridas?: string,
  ): Promise<void> {
    const html = this.buildEmailTemplateESAP(
      titulo,
      mensajePrincipal,
      detalles,
      badge,
      badgeBg,
      accionesRequeridas,
    );
    await Promise.all(
      destinatarios
        .filter((d) => d.email && d.email.trim().length > 0)
        .map((d) =>
          this.sendEmail(d.email.trim(), asunto, html, mensajePrincipal).catch((err) =>
            this.logger.error(`Error enviando correo bulk a ${d.email}: ${err.message}`),
          ),
        ),
    );
  }
}
