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

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly baseUrl: string;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3009';
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
      this.logger.error(`[NotificationClient] Error consultando rol "${roleCode}": ${err?.message}`);
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
    this.logger.log(`Notificando a ${userIds.length} usuario(s) con rol ${roleCode}`);
    const notifications = userIds.map((id) => ({ ...dto, id_usuario_destinatario: id }));
    await this.sendMany(notifications);
  }

  async send(dto: SendNotificationDto): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notificaciones/api/v1/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo enviar notificación a ${dto.id_usuario_destinatario}: ${err?.message}`);
    }
  }

  async sendMany(dtos: SendNotificationDto[]): Promise<void> {
    if (!dtos.length) return;
    try {
      const response = await fetch(`${this.baseUrl}/notificaciones/api/v1/notifications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: dtos }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.logger.log(`[NotificationClient] Enviadas ${dtos.length} notificaciones vía HTTP`);
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
            dto.datos_adicionales ? JSON.stringify(dto.datos_adicionales) : null,
          ],
        );
      }
      this.logger.log(`[NotificationClient] Insertadas ${dtos.length} notificaciones directamente en BD`);
    } catch (err: any) {
      this.logger.error(`[NotificationClient] Falló insert directo en BD: ${err?.message}`);
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
      this.logger.error(`[NotificationClient] Error archivando notificaciones: ${err?.message}`);
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
      this.logger.error(`[NotificationClient] Error eliminando notificaciones: ${err?.message}`);
    }
  }
}
