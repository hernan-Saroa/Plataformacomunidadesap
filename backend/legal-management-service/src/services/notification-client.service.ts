import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios from 'axios';

const DEFAULT_INTERNAL_SERVICE_TOKEN = 'esap-super-secret-jwt-key-2024';

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
  private readonly authUrl: string;
  private readonly internalServiceToken?: string;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3009';
    this.authUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    this.internalServiceToken =
      process.env.INTERNAL_SERVICE_TOKEN ??
      process.env.JWT_SECRET ??
      DEFAULT_INTERNAL_SERVICE_TOKEN;
  }

  /**
   * Fallback directo a BD: lee usuarios con un rol dado consultando auth.user_roles
   * y auth."user". Útil cuando la llamada HTTP a auth-service falla por token o red.
   */
  private async getUsersByRoleFromDb(roleCode: string): Promise<{ id_user: string; email: string }[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT u.id_user::text AS id_user, u.username AS email
         FROM auth.role r
         JOIN auth.user_roles ur ON ur.id_rol = r.id
         JOIN auth."user" u      ON u.id_user = ur.id_user
         WHERE r.code = $1 AND COALESCE(r.is_active, true) = true
           AND COALESCE(u.is_active, true) = true
           AND COALESCE(ur.is_active, true) = true`,
        [roleCode],
      );
      this.logger.log(`[notifyByRole][DB] Rol ${roleCode}: ${rows.length} usuario(s) activos`);
      return rows;
    } catch (err: any) {
      this.logger.warn(`[notifyByRole][DB] Error consultando BD para rol ${roleCode}: ${err?.message}`);
      return [];
    }
  }

  /**
   * Obtiene los detalles de usuario (ID y correo) que tienen asignado un rol específico.
   */
  async getUsersDetailsByRole(roleCode: string): Promise<{ id_user: string; email: string }[]> {
    // Estrategia: intentar HTTP primero (más rica en datos), si falla o viene vacío, leer BD directo.
    try {
      const rolesRes = await axios.get(`${this.authUrl}/roles`, {
        params: { limit: 200 },
        headers: this.buildAuthHeaders(),
        timeout: 3000,
      });
      const roles: any[] = rolesRes.data?.roles ?? [];
      const role = roles.find((r) => r.code === roleCode);
      if (!role) {
        this.logger.warn(`[notifyByRole][HTTP] Rol "${roleCode}" no encontrado vía auth-service, intentando BD directa`);
        return this.getUsersByRoleFromDb(roleCode);
      }
      this.logger.log(`[notifyByRole][HTTP] Rol "${roleCode}" resuelto a UUID ${role.id}`);

      const usersRes = await axios.get(`${this.authUrl}/users`, {
        params: { role: role.id, limit: 100 },
        headers: this.buildAuthHeaders(),
        timeout: 3000,
      });
      const users: any[] = usersRes.data?.data ?? [];
      const mapped = users
        .filter((u: any) => u?.user?.id_user)
        .map((u: any) => ({ id_user: u.user.id_user, email: u.email }));
      this.logger.log(`[notifyByRole][HTTP] auth devolvió ${users.length} usuarios; ${mapped.length} válidos`);

      if (mapped.length === 0) {
        this.logger.warn(`[notifyByRole][HTTP] 0 usuarios desde auth-service, fallback a BD directa`);
        return this.getUsersByRoleFromDb(roleCode);
      }
      return mapped;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.warn(
        `[notifyByRole][HTTP] Error (auth=${this.authUrl}, status=${status ?? 'n/a'}): ${err?.message}. Fallback a BD directa.`,
      );
      return this.getUsersByRoleFromDb(roleCode);
    }
  }

  /**
   * Obtiene solo los IDs de usuario que tienen asignado un rol específico.
   */
  async getUsersByRole(roleCode: string): Promise<string[]> {
    const details = await this.getUsersDetailsByRole(roleCode);
    return details.map(d => d.id_user);
  }

  /**
   * Envía una notificación in-app a todos los usuarios que tengan un rol específico.
   */
  async notifyByRole(roleCode: string, dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>): Promise<void> {
    const userIds = await this.getUsersByRole(roleCode);
    if (!userIds.length) {
      this.logger.log(`No hay usuarios con rol ${roleCode} para notificar`);
      return;
    }
    this.logger.log(`Notificando a ${userIds.length} usuario(s) con rol ${roleCode}`);
    const notifications = userIds.map((id) => ({ ...dto, id_usuario_destinatario: id }));
    await this.sendMany(notifications);
  }

  /**
   * Envía una notificación a múltiples roles simultáneamente.
   * Opcionalmente envía también un correo electrónico a los usuarios notificados.
   */
  async notifyByRoles(
    roleCodes: string[], 
    dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>,
    emailOptions?: { subject: string; html: string }
  ): Promise<void> {
    const allUsers = new Map<string, string | undefined>(); // id_user -> email
    
    for (const roleCode of roleCodes) {
      const details = await this.getUsersDetailsByRole(roleCode);
      details.forEach((u) => allUsers.set(u.id_user, u.email));
    }
    
    if (!allUsers.size) {
      this.logger.log(`No hay usuarios en roles [${roleCodes.join(', ')}] para notificar`);
      return;
    }
    
    this.logger.log(`Notificando a ${allUsers.size} usuario(s) con roles [${roleCodes.join(', ')}]`);
    
    // 1. Enviar notificación in-app
    const notifications = Array.from(allUsers.keys()).map((id) => ({ ...dto, id_usuario_destinatario: id }));
    await this.sendMany(notifications);

    // 2. Enviar correo electrónico si se solicita
    if (emailOptions) {
      const emails = Array.from(allUsers.values()).filter(Boolean) as string[];
      if (emails.length > 0) {
        this.logger.log(`Enviando correos electrónicos a ${emails.length} destinatarios`);
        for (const email of emails) {
          await this.sendEmail(email, emailOptions.subject, emailOptions.html);
        }
      }
    }
  }

  async send(dto: SendNotificationDto): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/notifications`, dto, { timeout: 3000 });
    } catch (err) {
      this.logger.warn(`No se pudo enviar notificación a ${dto.id_usuario_destinatario}: ${err?.message}`);
    }
  }

  async sendMany(dtos: SendNotificationDto[]): Promise<void> {
    if (!dtos.length) return;
    try {
      await axios.post(`${this.baseUrl}/notifications/bulk`, { notifications: dtos }, { timeout: 3000 });
      this.logger.log(`[notifyByRole] Enviadas ${dtos.length} notificaciones vía HTTP (${this.baseUrl})`);
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.warn(
        `[notifyByRole] FALLÓ POST ${this.baseUrl}/notifications/bulk (status=${status ?? 'n/a'}): ${err?.message}. Insertando directo en BD.`,
      );
    }

    // Fallback: insertar directo en notifications.notificacion
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
      this.logger.log(`[notifyByRole][DB] Insertadas ${dtos.length} notificaciones directamente en BD`);
    } catch (err: any) {
      this.logger.error(`[notifyByRole][DB] Falló insert directo en BD: ${err?.message}`);
    }
  }

  /**
   * Envía un correo electrónico mediante el servicio de notificaciones.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/v1/emails/send`, {
        to,
        subject,
        html
      }, { timeout: 5000 });
      this.logger.log(`Correo enviado exitosamente a ${to}`);
    } catch (err) {
      this.logger.warn(`No se pudo enviar correo a ${to}: ${err?.message}`);
    }
  }

  private buildAuthHeaders(): Record<string, string> | undefined {
    if (!this.internalServiceToken) {
      return undefined;
    }
    return {
      'x-internal-service-token': this.internalServiceToken,
    };
  }
}
