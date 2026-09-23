import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export interface SendNotificationDto {
  id_usuario_destinatario: string;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  descripcion_corta?: string;
  icono?: string;
  color?: string;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  categoria?: string;
  tiene_accion?: boolean;
  texto_boton_accion?: string;
  url_accion?: string;
  datos_adicionales?: Record<string, any>;
}

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly baseUrl: string;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3009';
  }

  async getUserDetailsById(userId: string): Promise<{ id_user: string; email: string } | null> {
    try {
      const rows = await this.dataSource.query(
        `SELECT u.id_user::text AS id_user, COALESCE(p.dir_email, u.username) AS email
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE (u.id_user::text = $1 OR u.public_id::text = $1 OR u.id_person::text = $1)
           AND COALESCE(u.is_active, true) = true
         LIMIT 1`,
        [userId],
      );
      return rows[0] || null;
    } catch (err: any) {
      this.logger.error(`[notifyUser] Error resolviendo email de usuario "${userId}": ${err?.message}`);
      return null;
    }
  }

  async notifyUserById(
    userId: string,
    dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>,
    emailOptions?: { subject: string; html: string },
  ): Promise<void> {
    try {
      const detail = await this.getUserDetailsById(userId);
      if (!detail) {
        this.logger.warn(`[notifyUser] No se encontró usuario con id="${userId}"`);
        return;
      }
      await this.sendMany([{ ...dto, id_usuario_destinatario: detail.id_user }]);
      if (emailOptions && detail.email) {
        await this.sendEmail(detail.email, emailOptions.subject, emailOptions.html);
      }
    } catch (err: any) {
      this.logger.error(`[notifyUser] Error notificando usuario "${userId}": ${err?.message}`);
    }
  }

  private async httpPostJson(targetUrl: string, payload: unknown, timeoutMs = 5000): Promise<{ ok: boolean; status: number | null; errMessage?: string }> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const lib = parsed.protocol === 'https:' ? https : http;
        const postData = JSON.stringify(payload);
        const opts: http.RequestOptions | https.RequestOptions = {
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : undefined,
          path: parsed.pathname + (parsed.search || ''),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: timeoutMs,
        };
        const req = lib.request(opts, (res) => {
          res.resume();
          res.on('end', () => resolve({ ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300, status: res.statusCode ?? null }));
        });
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        req.on('error', (e: any) => resolve({ ok: false, status: null, errMessage: e?.message }));
        req.write(postData);
        req.end();
      } catch (err: any) {
        resolve({ ok: false, status: null, errMessage: err?.message });
      }
    });
  }

  async send(dto: SendNotificationDto): Promise<void> {
    const r = await this.httpPostJson(`${this.baseUrl}/notifications`, dto, 3000);
    if (!r.ok) this.logger.warn(`No se pudo enviar notificación a ${dto.id_usuario_destinatario}: ${r.errMessage ?? `status=${r.status}`}`);
  }

  async sendMany(dtos: SendNotificationDto[]): Promise<void> {
    if (!dtos.length) return;
    const bulkUrl = `${this.baseUrl}/notifications/bulk`;
    const res = await this.httpPostJson(bulkUrl, { notifications: dtos }, 3000);
    if (res.ok) {
      this.logger.log(`[notify] Enviadas ${dtos.length} notificaciones vía HTTP (${this.baseUrl})`);
      return;
    }
    this.logger.warn(`[notify] FALLÓ POST ${bulkUrl} (status=${res.status ?? 'n/a'}): ${res.errMessage ?? 'n/a'}. Insertando directo en BD.`);
    try {
      await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS notifications`);
      for (const dto of dtos) {
        await this.dataSource.query(
          `INSERT INTO notifications.notificacion
            (id_usuario_destinatario, tipo_notificacion, titulo, mensaje, descripcion_corta,
             icono, color, prioridad, categoria, tiene_accion, texto_boton_accion, url_accion, datos_adicionales)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            dto.id_usuario_destinatario,
            dto.tipo_notificacion,
            dto.titulo,
            dto.mensaje,
            dto.descripcion_corta ?? null,
            dto.icono ?? null,
            dto.color ?? null,
            dto.prioridad ?? 'Media',
            dto.categoria ?? null,
            dto.tiene_accion ?? false,
            dto.texto_boton_accion ?? null,
            dto.url_accion ?? null,
            dto.datos_adicionales ? JSON.stringify(dto.datos_adicionales) : null,
          ],
        );
      }
      this.logger.log(`[notify][DB] Insertadas ${dtos.length} notificaciones directamente en BD`);
    } catch (err: any) {
      this.logger.error(`[notify][DB] Falló insert directo en BD: ${err?.message}`);
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const res = await this.httpPostJson(`${this.baseUrl}/api/v1/emails/send`, { to, subject, html }, 5000);
    if (res.ok) this.logger.log(`Correo enviado exitosamente a ${to}`);
    else this.logger.warn(`No se pudo enviar correo a ${to}: ${res.errMessage ?? `status=${res.status}`}`);
  }
}
