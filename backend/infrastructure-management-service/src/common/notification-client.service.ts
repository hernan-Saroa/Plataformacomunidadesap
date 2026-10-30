import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as http from 'http';
import * as https from 'https';

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

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Resuelve endpoints base ordenados por preferencia:
   * 1. Variable de entorno NOTIFICATION_SERVICE_URL (ej. http://notifications-service:3009)
   * 2. Host de red interna Docker/Podman 'http://notifications-service:3009'
   * 3. Host local 'http://localhost:3009' (para ejecución directa en host)
   */
  private getCandidateBaseUrls(): string[] {
    const list = [
      process.env.NOTIFICATION_SERVICE_URL,
      'http://notifications-service:3009',
      'http://localhost:3009',
    ]
      .filter((u): u is string => Boolean(u && u.trim()))
      .map((u) => u.trim().replace(/\/$/, ''));
    return Array.from(new Set(list));
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

  private async httpPostJson(
    targetUrl: string,
    payload: unknown,
    timeoutMs = 5000,
  ): Promise<{ ok: boolean; status: number | null; errMessage?: string }> {
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
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            const status = res.statusCode ?? 500;
            const ok = status >= 200 && status < 300;
            resolve({ ok, status, errMessage: ok ? undefined : body });
          });
        });
        req.on('timeout', () => {
          req.destroy(new Error('timeout'));
        });
        req.on('error', (e: any) => resolve({ ok: false, status: null, errMessage: e?.message }));
        req.write(postData);
        req.end();
      } catch (err: any) {
        resolve({ ok: false, status: null, errMessage: err?.message });
      }
    });
  }

  async send(dto: SendNotificationDto): Promise<void> {
    await this.sendMany([dto]);
  }

  async sendMany(dtos: SendNotificationDto[]): Promise<void> {
    if (!dtos.length) return;

    let sentHttp = false;
    const baseUrls = this.getCandidateBaseUrls();

    for (const base of baseUrls) {
      const bulkUrl = `${base}/notifications/bulk`;
      const res = await this.httpPostJson(bulkUrl, { notifications: dtos }, 4000);
      if (res.ok) {
        this.logger.log(`[notify] Enviadas ${dtos.length} notificaciones vía HTTP (${bulkUrl})`);
        sentHttp = true;
        break;
      }
    }

    if (!sentHttp) {
      this.logger.warn(
        `[notify] POST a notifications-service falló en todos los endpoints candidatos. Insertando directo en BD.`,
      );
      try {
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
  }

  async getEncargadosUmi(): Promise<{ id_user: string; email: string; nom_largo?: string }[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT u.id_user::text AS id_user,
                COALESCE(p.dir_email, u.username) AS email,
                p.nom_largo
           FROM auth.user_roles ur
           JOIN auth."user" u ON u.id_user = ur.id_user
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
           JOIN auth.role r ON r.id = ur.id_rol
          WHERE r.code IN ('ANALISTA_ASIGNADOR_UMI', 'ADMINISTRADOR_FUNCIONAL_INFRA')
            AND COALESCE(u.is_active, true) = true`,
      );
      return Array.isArray(rows) ? rows : [];
    } catch (err: any) {
      this.logger.warn(`[NOTIFICACION_DEBUG] Error consultando Encargados UMI en auth: ${err?.message}`);
      return [];
    }
  }

  /**
   * Envía correo institucional a través de notifications-service (/api/v1/emails/send).
   * Log agresivo para trazabilidad de errores y resolución multi-entorno.
   * Por defecto enviarCopiaPrueba es FALSE para evitar correos duplicados innecesarios.
   */
  async sendEmail(to: string, subject: string, html: string, enviarCopiaPrueba = false): Promise<boolean> {
    if (!to || !to.includes('@')) {
      this.logger.warn(`[EMAIL_DISPATCH][SKIP] Destinatario "${to}" no es un correo electrónico válido.`);
      return false;
    }

    const candidateUrls: string[] = [];
    for (const b of this.getCandidateBaseUrls()) {
      candidateUrls.push(`${b}/api/v1/emails/send`);
      candidateUrls.push(`${b}/notificaciones/api/v1/emails/send`);
      candidateUrls.push(`${b}/emails/send`);
    }

    this.logger.log(
      `[EMAIL_DISPATCH][START] Para: ${to} | Asunto: "${subject}" | Intentando ${candidateUrls.length} endpoint(s)...`,
    );

    let sent = false;
    let lastError: string | undefined;

    for (const targetUrl of candidateUrls) {
      try {
        this.logger.log(`[EMAIL_DISPATCH][TRY] Enviando POST a ${targetUrl}...`);
        const res = await this.httpPostJson(targetUrl, { to, subject, html }, 5000);
        if (res.ok) {
          this.logger.log(
            `[EMAIL_DISPATCH][SUCCESS] Correo entregado exitosamente a ${to} vía ${targetUrl} (Status: ${res.status})`,
          );
          sent = true;
          break;
        } else {
          lastError = `Status ${res.status}: ${res.errMessage || 'Respuesta no exitosa'}`;
          this.logger.warn(`[EMAIL_DISPATCH][FAIL] Endpoint ${targetUrl} respondió: ${lastError}`);
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        this.logger.warn(`[EMAIL_DISPATCH][ERROR] Excepción de conexión hacia ${targetUrl}: ${lastError}`);
      }
    }

    if (!sent) {
      this.logger.error(`[EMAIL_DISPATCH][FAILED_ALL] No se pudo entregar correo a ${to}. Último error: ${lastError}`);
    }

    // Copia opcional de prueba sólo si está explícitamente activada por variable de entorno o argumento
    const enableTestCopy = process.env.ENABLE_EMAIL_TEST_COPY === 'true';
    const CORREO_PRUEBA = process.env.EMAIL_TEST_COPY_TARGET || 'desarrollo.ccd@esap.edu.co';

    if ((enviarCopiaPrueba || enableTestCopy) && to.toLowerCase() !== CORREO_PRUEBA.toLowerCase()) {
      try {
        const copiaSubject = `[COPIA PRUEBA][Para: ${to}] ${subject}`;
        this.logger.log(`[EMAIL_DISPATCH][COPIA_PRUEBA] Enviando copia opcional a ${CORREO_PRUEBA}...`);
        for (const targetUrl of candidateUrls) {
          const resCopia = await this.httpPostJson(
            targetUrl,
            { to: CORREO_PRUEBA, subject: copiaSubject, html },
            5000,
          );
          if (resCopia.ok) {
            this.logger.log(`[EMAIL_DISPATCH][COPIA_PRUEBA_SUCCESS] Copia entregada a ${CORREO_PRUEBA}`);
            break;
          }
        }
      } catch (copyErr: any) {
        this.logger.warn(`[EMAIL_DISPATCH][COPIA_PRUEBA_ERROR] ${copyErr?.message}`);
      }
    }

    return sent;
  }
}
