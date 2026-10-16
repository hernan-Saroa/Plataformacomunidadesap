import { Injectable } from '@nestjs/common';

export interface IdentityWelcomeMail {
  to: string;
  username: string;
  temporaryPassword: string;
  fullName: string;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

/** Adaptador opcional del contrato existente; ningún retry o log del mensaje. */
@Injectable()
export class AuthIdentityMailClient {
  async enviar(mail: IdentityWelcomeMail): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const configured = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
      const base = configured || (process.env.NODE_ENV === 'production'
        ? 'http://notifications-service:3009' : 'http://localhost:3009');
      const url = new URL(base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return false;
      if (!mail || typeof mail.to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.to)
        || [mail.username, mail.temporaryPassword, mail.fullName].some(value => typeof value !== 'string' || !value.trim() || value.includes('\0'))) return false;
      const text = [`Hola ${mail.fullName},`, '', 'Tu usuario docente fue creado en la plataforma ESAP.',
        `Usuario: ${mail.username}`, `Contraseña temporal: ${mail.temporaryPassword}`, '',
        'Por seguridad, cambia tu contraseña en el primer ingreso.'].join('\n');
      const html = `<p>Hola ${escapeHtml(mail.fullName)},</p><p>Tu usuario docente fue creado en la plataforma ESAP.</p>`
        + `<p><strong>Usuario:</strong> ${escapeHtml(mail.username)}<br><strong>Contraseña temporal:</strong> ${escapeHtml(mail.temporaryPassword)}</p>`
        + '<p>Por seguridad, cambia tu contraseña en el primer ingreso.</p>';
      const response = await fetch(`${base.replace(/\/$/, '')}/api/v1/emails/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: mail.to, subject: 'Credenciales de acceso - Banco de Docentes ESAP', text, html }),
        signal: controller.signal, cache: 'no-store', redirect: 'error',
      });
      if (response.status !== 201) return false;
      const receipt: unknown = await response.json();
      return !controller.signal.aborted && !!receipt && typeof receipt === 'object' && !Array.isArray(receipt)
        && Object.keys(receipt).length === 1 && (receipt as any).message === 'Correo enviado';
    } catch {
      // El proveedor pudo aceptar SMTP antes del fallo. Nunca interpretarlo como permiso para reenviar.
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
