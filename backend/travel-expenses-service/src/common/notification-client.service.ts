import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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

export interface SendEmailDto {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface RecipientInfo {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
}

export interface TravelExpenseEmailOptions {
  destinatarioNombre?: string;
  tituloHeader?: string;
  subtituloHeader?: string;
  mensajePrincipal: string;
  consecutivo: string;
  comisionadoNombre?: string;
  destino?: string;
  fechas?: string;
  fechaInicio?: string;
  fechaFin?: string;
  nuevoEstado?: string;
  estadoBadge?: string;
  badgeColor?: string;
  observaciones?: string;
  motivoUObservaciones?: string;
  tipoNovedad?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  textoBoton?: string;
  botonTexto?: string;
  urlAccion?: string;
  botonUrl?: string;
}

export interface TravelExpenseEmailPayload {
  subject?: string;
  asunto?: string;
  html?: string;
  text?: string;
}

export function buildTravelExpenseEmailHtml(options: TravelExpenseEmailOptions): string {
  const {
    destinatarioNombre = 'Usuario(a)',
    tituloHeader = 'ESAP — Sistema de Gestión de Viáticos y Comisiones',
    subtituloHeader = 'Notificación Institucional de Trámite',
    mensajePrincipal,
    consecutivo,
    comisionadoNombre,
    destino,
    tipoNovedad = 'INFO',
  } = options;

  const nuevoEstado = options.nuevoEstado || options.estadoBadge;
  const motivoUObservaciones = options.motivoUObservaciones || options.observaciones;
  const fechas =
    options.fechas ||
    (options.fechaInicio && options.fechaFin
      ? `${options.fechaInicio} al ${options.fechaFin}`
      : options.fechaInicio || undefined);
  const textoBoton = options.textoBoton || options.botonTexto || 'Ingresar a la Plataforma';
  const urlAccion =
    options.urlAccion ||
    options.botonUrl ||
    `${process.env.APP_BASE_URL || 'http://localhost:3000'}/viaticos`;

  let badgeBg = options.badgeColor || '#003DA5';
  let boxBg = '#eff6ff';
  let boxBorder = '#3b82f6';
  let boxText = '#1e40af';
  let labelNovedad = 'INFORMACIÓN DEL TRÁMITE';

  if (tipoNovedad === 'SUCCESS' || nuevoEstado === 'PAGADA' || nuevoEstado === 'AUTORIZADA') {
    if (!options.badgeColor) badgeBg = '#059669';
    boxBg = '#ecfdf5';
    boxBorder = '#10b981';
    boxText = '#065f46';
    labelNovedad = 'TRÁMITE EXITOSO / AVANCE';
  } else if (tipoNovedad === 'WARNING' || nuevoEstado?.includes('REINTEGRO') || nuevoEstado?.includes('DEVOLUCIÓN')) {
    if (!options.badgeColor) badgeBg = '#d97706';
    boxBg = '#fffbeb';
    boxBorder = '#f59e0b';
    boxText = '#92400e';
    labelNovedad = 'ATENCIÓN REQUERIDA';
  } else if (tipoNovedad === 'DANGER' || nuevoEstado === 'RECHAZADA' || nuevoEstado === 'CANCELADA') {
    if (!options.badgeColor) badgeBg = '#dc2626';
    boxBg = '#fef2f2';
    boxBorder = '#ef4444';
    boxText = '#991b1b';
    labelNovedad = 'NOVEDAD DEL PROCESO';
  }

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #003DA5; color: #ffffff; padding: 22px 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 19px; font-weight: bold; letter-spacing: -0.2px;">${tituloHeader}</h2>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">${subtituloHeader}</p>
      </div>

      <div style="padding: 24px 28px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0;">Estimado(a) <strong>${destinatarioNombre}</strong>,</p>
        <p style="color: #334155; margin-bottom: 20px;">${mensajePrincipal}</p>

        ${
          motivoUObservaciones
            ? `
        <div style="background-color: ${boxBg}; border-left: 4px solid ${boxBorder}; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
          <strong style="color: ${boxText}; display: block; margin-bottom: 6px; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">
            ${labelNovedad}
          </strong>
          <p style="margin: 0; color: ${boxText}; font-size: 13px; white-space: pre-wrap;">${motivoUObservaciones}</p>
        </div>`
            : ''
        }

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; border: 1px solid #f1f5f9; border-radius: 8px;">
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; width: 38%; font-weight: 600;">Radicado / Consecutivo:</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: bold; font-family: monospace; font-size: 14px;">${consecutivo}</td>
          </tr>
          ${
            comisionadoNombre
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Comisionado(a):</td>
            <td style="padding: 10px 14px; color: #0f172a;">${comisionadoNombre}</td>
          </tr>`
              : ''
          }
          ${
            destino
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Destino:</td>
            <td style="padding: 10px 14px; color: #0f172a;">${destino}</td>
          </tr>`
              : ''
          }
          ${
            fechas
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Fechas Comisión:</td>
            <td style="padding: 10px 14px; color: #0f172a;">${fechas}</td>
          </tr>`
              : ''
          }
          ${
            nuevoEstado
              ? `
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Estado Actual:</td>
            <td style="padding: 10px 14px; color: ${badgeBg}; font-weight: bold;">${nuevoEstado}</td>
          </tr>`
              : ''
          }
        </table>

        <div style="margin: 28px 0 16px 0; text-align: center;">
          <a href="${urlAccion}" 
             style="background-color: #003DA5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${textoBoton}
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 14px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5;">
        Este es un mensaje institucional generado automáticamente por la Plataforma de Gestión de Viáticos y Comisiones de la Escuela Superior de Administración Pública (ESAP). Por favor no responda a este correo.
      </div>
    </div>
  `;
}

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly baseUrl: string;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.baseUrl =
      process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3009';
  }

  /**
   * Obtiene los destinatarios (id_user, email, fullName) que poseen un permiso general inmutable.
   * Si no se encuentra ninguno y se provee fallbackRoleCode, consulta por código de rol tradicional.
   */
  async getRecipientsByPermission(
    permissionCode: string,
    fallbackRoleCode?: string,
  ): Promise<RecipientInfo[]> {
    try {
      // 1. Consulta principal por código de permiso inmutable
      const rows = await this.dataSource.query(
        `SELECT DISTINCT
           u.id_user::text AS id,
           COALESCE(p_person.dir_email, u.username, '') AS email,
           COALESCE(p_person.nom_largo, TRIM(CONCAT_WS(' ', p_person.nom_tercero, p_person.pri_apellido)), u.username, '') AS full_name,
           u.username
         FROM auth."user" u
         INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
         INNER JOIN auth.role r ON r.id = ur.id_rol
         INNER JOIN auth.role_permissions rp ON rp.id_rol = r.id
         INNER JOIN auth.permission p ON p.id_permission = rp.id_permission
         LEFT JOIN auth.personas p_person ON p_person.id_person = u.id_person
         WHERE u.is_active = true
           AND COALESCE(ur.is_active, true) = true
           AND COALESCE(r.is_active, true) = true
           AND COALESCE(rp.is_active, true) = true
           AND COALESCE(p.is_active, true) = true
           AND (p.code = $1 OR UPPER(p.code) = UPPER($1))`,
        [permissionCode],
      );

      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          email: (r.email || '').trim(),
          fullName: (r.full_name || '').trim(),
          username: (r.username || '').trim(),
        }));
      }

      // 2. Fallback: Si no hay usuarios con el permiso asignado aún, recurrir al rol tradicional si se especificó
      if (fallbackRoleCode) {
        this.logger.debug(
          `[NotificationClient] Sin usuarios para permiso "${permissionCode}". Probando fallback a rol "${fallbackRoleCode}"`,
        );
        const fallbackRows = await this.dataSource.query(
          `SELECT DISTINCT
             u.id_user::text AS id,
             COALESCE(p_person.dir_email, u.username, '') AS email,
             COALESCE(p_person.nom_largo, TRIM(CONCAT_WS(' ', p_person.nom_tercero, p_person.pri_apellido)), u.username, '') AS full_name,
             u.username
           FROM auth."user" u
           INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
           INNER JOIN auth.role r ON r.id = ur.id_rol
           LEFT JOIN auth.personas p_person ON p_person.id_person = u.id_person
           WHERE u.is_active = true
             AND COALESCE(ur.is_active, true) = true
             AND COALESCE(r.is_active, true) = true
             AND (r.id::text = $1 OR UPPER(r.code) = UPPER($1) OR UPPER(r.name) = UPPER($1))`,
          [fallbackRoleCode],
        );
        return (fallbackRows || []).map((r: any) => ({
          id: r.id,
          email: (r.email || '').trim(),
          fullName: (r.full_name || '').trim(),
          username: (r.username || '').trim(),
        }));
      }

      return [];
    } catch (err: any) {
      this.logger.error(
        `[NotificationClient] Error consultando destinatarios para permiso "${permissionCode}": ${err?.message}`,
      );
      return [];
    }
  }

  /**
   * Obtiene los datos de contacto (id_user, email, fullName) para un usuario específico por su ID.
   */
  async getRecipientByUserId(userId: string): Promise<RecipientInfo | null> {
    if (!userId) return null;
    try {
      const rows = await this.dataSource.query(
        `SELECT
           u.id_user::text AS id,
           COALESCE(p_person.dir_email, u.username, '') AS email,
           COALESCE(p_person.nom_largo, TRIM(CONCAT_WS(' ', p_person.nom_tercero, p_person.pri_apellido)), u.username, '') AS full_name,
           u.username
         FROM auth."user" u
         LEFT JOIN auth.personas p_person ON p_person.id_person = u.id_person
         WHERE u.id_user = $1
         LIMIT 1`,
        [userId],
      );
      const r = rows?.[0];
      if (!r) return null;
      return {
        id: r.id,
        email: (r.email || '').trim(),
        fullName: (r.full_name || '').trim(),
        username: (r.username || '').trim(),
      };
    } catch (err: any) {
      this.logger.warn(
        `[NotificationClient] Error consultando datos del usuario ${userId}: ${err?.message}`,
      );
      return null;
    }
  }

  /**
   * Obtiene los IDs de usuario que cuentan con un permiso general.
   */
  async getUsersByPermission(
    permissionCode: string,
    fallbackRoleCode?: string,
  ): Promise<string[]> {
    const recipients = await this.getRecipientsByPermission(
      permissionCode,
      fallbackRoleCode,
    );
    return recipients.map((r) => r.id);
  }

  /**
   * Obtiene los correos institucionales de los usuarios que cuentan con un permiso general.
   */
  async getEmailsByPermission(
    permissionCode: string,
    fallbackRoleCode?: string,
  ): Promise<string[]> {
    const recipients = await this.getRecipientsByPermission(
      permissionCode,
      fallbackRoleCode,
    );
    return recipients
      .map((r) => r.email)
      .filter((email) => email && email.includes('@'));
  }

  /**
   * Despacha notificación in-app y correo institucional a todos los usuarios
   * que posean un permiso general inmutable.
   */
  async notifyByPermission(
    permissionCode: string,
    dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>,
    emailDto?: TravelExpenseEmailPayload,
    fallbackRoleCode?: string,
  ): Promise<void> {
    const recipients = await this.getRecipientsByPermission(
      permissionCode,
      fallbackRoleCode,
    );

    if (!recipients.length) {
      this.logger.log(
        `[NotificationClient] No hay destinatarios con permiso "${permissionCode}" para notificar`,
      );
      return;
    }

    this.logger.log(
      `[NotificationClient] Notificando a ${recipients.length} usuario(s) con permiso "${permissionCode}"`,
    );

    // 1. In-App: Notificación a la bandeja de cada usuario
    const inAppNotifications = recipients.map((r) => ({
      ...dto,
      id_usuario_destinatario: r.id,
    }));
    await this.sendMany(inAppNotifications);

    // 2. Correo electrónico institucional
    const subject = emailDto?.subject || emailDto?.asunto;
    if (subject) {
      const validEmails = Array.from(
        new Set(
          recipients
            .map((r) => r.email)
            .filter((email) => Boolean(email && email.includes('@'))),
        ),
      );

      for (const email of validEmails) {
        await this.sendEmail({
          to: email,
          subject,
          html: emailDto.html,
          text: emailDto.text ?? dto.mensaje,
        });
      }
    }
  }

  /**
   * Despacha notificación in-app y correo institucional a un usuario específico (individual).
   */
  async notifyUser(
    userId: string,
    dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>,
    emailDto?: TravelExpenseEmailPayload,
  ): Promise<void> {
    if (!userId) return;

    // 1. Notificación in-app
    await this.send({
      ...dto,
      id_usuario_destinatario: userId,
    });

    // 2. Correo electrónico al usuario
    const subject = emailDto?.subject || emailDto?.asunto;
    if (subject) {
      const recipient = await this.getRecipientByUserId(userId);
      if (recipient?.email && recipient.email.includes('@')) {
        await this.sendEmail({
          to: recipient.email,
          subject,
          html: emailDto.html,
          text: emailDto.text ?? dto.mensaje,
        });
      } else {
        this.logger.warn(
          `[NotificationClient] Usuario ${userId} no tiene correo configurado para despacho de email`,
        );
      }
    }
  }

  async getUsersByRole(roleCode: string): Promise<string[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT DISTINCT u.id_user::text AS id_user
         FROM auth."user" u
         INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
         INNER JOIN auth.role r ON r.id = ur.id_rol
         WHERE u.is_active = true
           AND (r.id::text = $1 OR UPPER(r.code) = UPPER($1) OR UPPER(r.name) = UPPER($1))
           AND COALESCE(ur.is_active, true) = true
           AND COALESCE(r.is_active, true) = true`,
        [roleCode],
      );
      return rows.map((r: any) => r.id_user);
    } catch (err: any) {
      this.logger.error(
        `[NotificationClient] Error consultando rol "${roleCode}": ${err?.message}`,
      );
      return [];
    }
  }

  async getEmailsByRole(roleCode: string): Promise<string[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT DISTINCT COALESCE(p_person.dir_email, u.username, '') AS email
         FROM auth."user" u
         INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
         INNER JOIN auth.role r ON r.id = ur.id_rol
         LEFT JOIN auth.personas p_person ON p_person.id_person = u.id_person
         WHERE u.is_active = true
           AND (r.id::text = $1 OR UPPER(r.code) = UPPER($1) OR UPPER(r.name) = UPPER($1))
           AND COALESCE(ur.is_active, true) = true
           AND COALESCE(r.is_active, true) = true`,
        [roleCode],
      );
      return rows
        .map((r: any) => r.email)
        .filter((email: string) => email && email.includes('@'));
    } catch (err: any) {
      this.logger.error(
        `[NotificationClient] Error consultando correos para rol "${roleCode}": ${err?.message}`,
      );
      return [];
    }
  }

  async notifyByRole(
    roleCode: string,
    dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>,
  ): Promise<void> {
    const userIds = await this.getUsersByRole(roleCode);
    if (!userIds.length) {
      this.logger.log(`No hay usuarios con rol ${roleCode} para notificar`);
      return;
    }
    this.logger.log(
      `Notificando a ${userIds.length} usuario(s) con rol ${roleCode}`,
    );
    const notifications = userIds.map((id) => ({
      ...dto,
      id_usuario_destinatario: id,
    }));
    await this.sendMany(notifications);
  }

  /**
   * Envía una notificación a la bandeja de notificaciones del software (in-app).
   * Intenta primero por HTTP hacia el microservicio de notificaciones y,
   * en caso de contingencia, inserta directamente en la tabla notifications.notificacion.
   */
  async send(dto: SendNotificationDto): Promise<void> {
    const urls = [
      `${this.baseUrl}/notificaciones/api/v1/notifications`,
      `${this.baseUrl}/api/v1/notifications`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dto),
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
          return;
        }
      } catch {
        // continúa al siguiente endpoint o fallback
      }
    }

    // Fallback: inserción directa en la base de datos de notificaciones
    try {
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
          dto.datos_adicionales
            ? JSON.stringify(dto.datos_adicionales)
            : null,
        ],
      );
      this.logger.log(
        `[NotificationClient] Notificación in-app insertada directamente en BD para ${dto.id_usuario_destinatario}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[NotificationClient] No se pudo guardar notificación in-app para ${dto.id_usuario_destinatario}: ${err?.message}`,
      );
    }
  }

  /**
   * Envía un correo electrónico institucional a través del servicio de correos/notificaciones.
   */
  async sendEmail(dto: SendEmailDto): Promise<void> {
    if (!dto.to || !dto.subject) {
      return;
    }
    const urls = [
      `${this.baseUrl}/api/v1/emails/send`,
      `${this.baseUrl}/notificaciones/api/v1/emails/send`,
    ];
    let sent = false;
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dto),
        });
        if (response.ok) {
          this.logger.log(`[NotificationClient] Correo enviado exitosamente a ${dto.to} vía ${url}`);
          sent = true;
          break;
        }
      } catch (err: any) {
        this.logger.warn(`[NotificationClient] Error conectando a ${url}: ${err?.message}`);
      }
    }
    if (!sent) {
      this.logger.warn(`[NotificationClient] No se pudo despachar correo a ${dto.to}`);
    }
  }

  async sendMany(dtos: SendNotificationDto[]): Promise<void> {
    if (!dtos.length) return;
    try {
      const response = await fetch(
        `${this.baseUrl}/notificaciones/api/v1/notifications/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications: dtos }),
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.logger.log(
        `[NotificationClient] Enviadas ${dtos.length} notificaciones vía HTTP`,
      );
      return;
    } catch (err: any) {
      this.logger.warn(
        `[NotificationClient] Falló POST bulk (status=${err?.status ?? 'n/a'}): ${err?.message}. Insertando directo en BD.`,
      );
    }

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
            dto.datos_adicionales
              ? JSON.stringify(dto.datos_adicionales)
              : null,
          ],
        );
      }
      this.logger.log(
        `[NotificationClient] Insertadas ${dtos.length} notificaciones directamente en BD`,
      );
    } catch (err: any) {
      this.logger.error(
        `[NotificationClient] Falló insert directo en BD: ${err?.message}`,
      );
    }
  }

  async archiveNotificacionesPorSolicitud(solicitudId: string): Promise<void> {
    try {
      const result = await this.dataSource.query(
        `UPDATE notifications.notificacion
         SET archivada = true, fecha_archivado = NOW()
         WHERE categoria = 'VIATICOS'
           AND datos_adicionales @> $1
           AND archivada = false`,
        [JSON.stringify({ solicitudId })],
      );
      this.logger.log(
        `[NotificationClient] Archivadas ${result.length || result.affected || 0} notificaciones para solicitud ${solicitudId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[NotificationClient] Error archivando notificaciones: ${err?.message}`,
      );
    }
  }

  async deleteNotificacionesPorSolicitud(solicitudId: string): Promise<void> {
    try {
      const result = await this.dataSource.query(
        `DELETE FROM notifications.notificacion
         WHERE categoria = 'VIATICOS'
           AND datos_adicionales @> $1`,
        [JSON.stringify({ solicitudId })],
      );
      this.logger.log(
        `[NotificationClient] Eliminadas ${result.length || result.affected || 0} notificaciones para solicitud ${solicitudId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[NotificationClient] Error eliminando notificaciones: ${err?.message}`,
      );
    }
  }
}
