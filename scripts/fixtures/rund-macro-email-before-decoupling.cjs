/* Referencia del envío anterior: solo helpers/correo extraídos de la copia RUND previa, sin SQL. */
"use strict";
class PriorMacroEmail {
    constructor() {
        this.logger = { log: (..._args) => { }, warn: (..._args) => { } };
    }
    resolveBaseUrl() {
        const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
        if (direct)
            return direct.replace(/\/$/, '');
        if ((process.env.NODE_ENV || 'development') !== 'production')
            return 'http://localhost:3009';
        return 'http://notifications-service:3009';
    }
    resolvePublicAppUrl() {
        const direct = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL;
        return (direct || 'http://localhost:3000').replace(/\/$/, '');
    }
    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    async postJson(path, payload) {
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
        }
        catch (error) {
            this.logger.warn(`No se pudo conectar a notifications-service (${path}): ${error?.message}`);
            return false;
        }
    }
    async sendEmail(to, subject, text, html) {
        if (!to)
            return;
        await this.postJson('/api/v1/emails/send', { to, subject, text, html });
    }
    async notifyAccesoExternoOtorgado(opts) {
        const to = (opts.enteContacto || '').trim();
        if (!to || !to.includes('@'))
            return false;
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
module.exports = PriorMacroEmail;
