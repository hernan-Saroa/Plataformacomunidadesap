import { Injectable, Logger } from '@nestjs/common';

/** Correo del acceso externo RUND; el contacto lo proporciona el acceso guardado. */
@Injectable()
export class MacroDocenteNotificationsService {
  private readonly logger = new Logger(MacroDocenteNotificationsService.name);

  private resolveBaseUrl(): string {
    const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) return direct.replace(/\/$/, '');
    if ((process.env.NODE_ENV || 'development') !== 'production') return 'http://localhost:3009';
    return 'http://notifications-service:3009';
  }

  private resolvePublicAppUrl(): string {
    const direct = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL;
    return (direct || 'http://localhost:3000').replace(/\/$/, '');
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async postJson(path: string, payload: any): Promise<boolean> {
    try {
      const res = await fetch(`${this.resolveBaseUrl()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.warn(`notifications-service ${path} respondió ${res.status}`);
        return false;
      }
      return true;
    } catch (error: any) {
      this.logger.warn(`No se pudo conectar a notifications-service (${path}): ${error?.message}`);
      return false;
    }
  }

  private async sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
    if (!to) return;
    await this.postJson('/api/v1/emails/send', { to, subject, text, html });
  }

  /**
   * REQ-RUND-F022 — Envía por correo el enlace de un acceso externo temporal al
   * Macro Docente recién otorgado. Best-effort: si no hay contacto con forma de
   * correo, o si notifications-service no responde, no lanza — GGP siempre puede
   * copiar el enlace manualmente desde la UI como respaldo.
   */
  async notifyAccesoExternoOtorgado(opts: {
    enteNombre: string;
    enteContacto: string | null;
    path: string;
    fechaFin: Date;
  }): Promise<boolean> {
    const to = (opts.enteContacto || '').trim();
    if (!to || !to.includes('@')) return false;

    const enlace = `${this.resolvePublicAppUrl()}${opts.path}`;
    const fechaFinTxt = opts.fechaFin.toLocaleDateString('es-CO');
    const subject = `Acceso temporal al Macro Docente RUND — ${opts.enteNombre}`;
    const text = `Se le otorgó un acceso temporal de consulta al Macro Docente (RUND) de la ESAP, vigente hasta el ${fechaFinTxt}.\n\nEnlace de consulta: ${enlace}\n\nEste enlace es personal e intransferible: toda consulta realizada con él queda registrada.`;
    const html = `
      <p>Se le otorgó un acceso temporal de consulta al <strong>Macro Docente</strong> (RUND) de la ESAP, vigente hasta el <strong>${this.escapeHtml(fechaFinTxt)}</strong>.</p>
      <p><a href="${this.escapeHtml(enlace)}">${this.escapeHtml(enlace)}</a></p>
      <p>Este enlace es personal e intransferible: toda consulta realizada con él queda registrada.</p>
    `;
    await this.sendEmail(to, subject, text, html);
    this.logger.log(`Acceso externo Macro Docente notificado por correo a ${to} (${opts.enteNombre})`);
    return true;
  }
}
