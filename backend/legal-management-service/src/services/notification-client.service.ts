import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import axios from 'axios';

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
  /** Código del módulo en la configuración de notificaciones (EFDS-2406); si no viene, es este módulo. */
  modulo?: string;
}

/** Código del módulo en la configuración de notificaciones (EFDS-2406). */
export const MODULO_NOTIFICACIONES = 'gestion-legal';

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly baseUrl: string;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3009';
  }

  /**
   * Obtiene los detalles de usuario (ID y correo) que tienen asignado un rol específico.
   * Lee directo de BD — ambos servicios comparten la misma base de datos,
   * por lo que no se necesita token ni configuración adicional entre ambientes.
   */
  async getUsersDetailsByRole(roleCode: string): Promise<{ id_user: string; email: string }[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT u.id_user::text AS id_user, COALESCE(p.dir_email, u.username) AS email
         FROM auth.role r
         JOIN auth.user_roles ur ON ur.id_rol = r.id
         JOIN auth."user" u      ON u.id_user = ur.id_user
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE r.code = $1
           AND COALESCE(r.is_active, true) = true
           AND COALESCE(u.is_active, true) = true
           AND COALESCE(ur.is_active, true) = true`,
        [roleCode],
      );
      this.logger.log(`[notifyByRole] Rol "${roleCode}": ${rows.length} usuario(s)`);
      return rows;
    } catch (err: any) {
      this.logger.error(`[notifyByRole] Error BD para rol "${roleCode}": ${err?.message}`);
      return [];
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
   * Resuelve los detalles (id_user y correo) de un usuario a partir de un identificador
   * que puede ser id_user, public_id o id_person. Mismo patrón que notifyUserById.
   */
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
          // El correo es el mismo evento que la campana: la configuración los decide juntos.
          await this.sendEmail(email, emailOptions.subject, emailOptions.html, dto.tipo_notificacion);
        }
      }
    }
  }

  /**
   * Resuelve el id_user correcto desde BD (acepta id_user o id_person) y envía la notificación.
   * Mismo patrón que notifyByRole — garantiza que el UUID coincide con el que usa el frontend.
   */
  async notifyUserById(userId: string, dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>): Promise<void> {
    try {
      const rows = await this.dataSource.query(
        `SELECT u.id_user::text AS id_user
         FROM auth."user" u
         WHERE (u.id_user::text = $1 OR u.public_id::text = $1 OR u.id_person::text = $1)
           AND COALESCE(u.is_active, true) = true
         LIMIT 1`,
        [userId],
      );
      if (!rows.length) {
        this.logger.warn(`[notifyUser] No se encontró usuario con id="${userId}"`);
        return;
      }
      await this.sendMany([{ ...dto, id_usuario_destinatario: rows[0].id_user }]);
    } catch (err: any) {
      this.logger.error(`[notifyUser] Error resolviendo usuario "${userId}": ${err?.message}`);
    }
  }

  async send(dto: SendNotificationDto): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/notifications`, { ...dto, modulo: dto.modulo ?? MODULO_NOTIFICACIONES }, { timeout: 3000 });
    } catch (err) {
      this.logger.warn(`No se pudo enviar notificación a ${dto.id_usuario_destinatario}: ${err?.message}`);
    }
  }

  async sendMany(entrada: SendNotificationDto[]): Promise<void> {
    if (!entrada.length) return;
    const dtos = entrada.map((dto) => ({ ...dto, modulo: dto.modulo ?? MODULO_NOTIFICACIONES }));
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

    // Fallback: insertar directo en notifications.notificacion. También obedece
    // la configuración de notificaciones: un módulo apagado no debe avisar
    // justo cuando el servicio central falla.
    try {
      for (const dto of dtos) {
        const decision = await this.permitidoPorConfiguracion(dto);
        if (!decision.permitido) {
          await this.registrarOmision(dto, decision.motivo || 'omitida');
          continue;
        }
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
            decision.prioridad ?? dto.prioridad ?? 'Media',
            dto.categoria ?? null,
            dto.tiene_accion ?? false,
            dto.texto_boton_accion ?? null,
            dto.url_accion ?? null,
            dto.datos_adicionales ? JSON.stringify(dto.datos_adicionales) : null,
          ],
        );
        await this.copiarAdicionales(dto, decision);
      }
      this.logger.log(`[notifyByRole][DB] Insertadas ${dtos.length} notificaciones directamente en BD`);
    } catch (err: any) {
      this.logger.error(`[notifyByRole][DB] Falló insert directo en BD: ${err?.message}`);
    }
  }

  /**
   * Lee directo el catálogo de la configuración de notificaciones (EFDS-2406),
   * misma base de datos. Si no existe o falla, deja pasar: el respaldo existe
   * para no perder avisos.
   */
  private async permitidoPorConfiguracion(
    dto: SendNotificationDto,
  ): Promise<{ permitido: boolean; motivo?: string; prioridad?: string | null; adicionales?: Adicionales }> {
    try {
      const [fila] = await this.dataSource.query(
        `SELECT m.activo AS modulo_activo, e.activo AS evento_activo, e.obligatorio,
                COALESCE(e.canal, m.canal_defecto) AS canal, e.prioridad,
                e.roles_adicionales, e.dependencias_adicionales, e.sedes_adicionales
           FROM notifications.modulo_notificacion m
           LEFT JOIN notifications.evento_notificacion e
             ON e.clave = $2 AND e.codigo_modulo = m.codigo
          WHERE m.codigo = $1`,
        [dto.modulo ?? MODULO_NOTIFICACIONES, dto.tipo_notificacion],
      );
      if (!fila) return { permitido: true };
      const adicionales = {
        roles: (fila.roles_adicionales || []).map((r: string) => String(r).toUpperCase()),
        dependencias: (fila.dependencias_adicionales || []).map(String),
        sedes: (fila.sedes_adicionales || []).map(String),
      };
      if (fila.obligatorio) return { permitido: true, prioridad: fila.prioridad, adicionales };
      if (fila.modulo_activo === false) return { permitido: false, motivo: 'modulo_inactivo' };
      if (fila.evento_activo === false) return { permitido: false, motivo: 'evento_inactivo' };
      if (fila.canal === 'correo') return { permitido: false, motivo: 'canal_solo_correo' };
      return { permitido: true, prioridad: fila.prioridad, adicionales };
    } catch (err: any) {
      this.logger.warn(`[notifyByRole][DB] No se pudo leer la configuración de notificaciones: ${err?.message}`);
      return { permitido: true };
    }
  }

  /**
   * Copia la campana a los destinatarios que el administrador sumó al aviso por
   * rol, dependencia o sede (EFDS-2406, función 4), igual que el servicio central.
   * El id sale del contenido y del día, con la misma fórmula del central: si luego
   * el central manda el mismo aviso, ON CONFLICT evita duplicarlo. Nunca rompe el
   * respaldo: si algo falla, la campana original ya quedó guardada.
   */
  private async copiarAdicionales(dto: SendNotificationDto, decision: { prioridad?: string | null; adicionales?: Adicionales }): Promise<void> {
    const a = decision.adicionales;
    if (!a || (!a.roles.length && !a.dependencias.length && !a.sedes.length)) return;
    try {
      const usuarios: { id_user: string }[] = await this.dataSource.query(
        `SELECT DISTINCT u.id_user::text AS id_user
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE COALESCE(u.is_active, true) = true
            AND (
              (cardinality($1::text[]) > 0 AND EXISTS (
                 SELECT 1 FROM auth.user_roles ur
                   JOIN auth.role r ON r.id = ur.id_rol
                  WHERE ur.id_user = u.id_user
                    AND COALESCE(ur.is_active, true) = true
                    AND UPPER(r.code) = ANY($1::text[])))
              OR (cardinality($2::bigint[]) > 0 AND p.id_dependencia = ANY($2::bigint[]))
              OR (cardinality($3::bigint[]) > 0 AND p.id_sede = ANY($3::bigint[]))
            )`,
        [a.roles, a.dependencias, a.sedes],
      );
      const dia = new Date().toISOString().slice(0, 10);
      for (const u of usuarios) {
        if (!u.id_user || u.id_user === dto.id_usuario_destinatario) continue;
        await this.dataSource.query(
          `INSERT INTO notifications.notificacion
            (id_notificacion, id_usuario_destinatario, tipo_notificacion, titulo, mensaje, descripcion_corta,
             icono, color, prioridad, categoria, tiene_accion, texto_boton_accion, url_accion, datos_adicionales)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id_notificacion) DO NOTHING`,
          [
            idDeterminista(`${dto.tipo_notificacion}|${dto.titulo}|${dto.mensaje}|${u.id_user}|${dia}`),
            u.id_user,
            dto.tipo_notificacion,
            dto.titulo,
            dto.mensaje,
            dto.descripcion_corta ?? null,
            dto.icono ?? null,
            dto.color ?? null,
            decision.prioridad ?? dto.prioridad ?? 'Media',
            dto.categoria ?? null,
            dto.tiene_accion ?? false,
            dto.texto_boton_accion ?? null,
            dto.url_accion ?? null,
            dto.datos_adicionales ? JSON.stringify(dto.datos_adicionales) : null,
          ],
        );
      }
    } catch (err: any) {
      this.logger.warn(`[notify][DB] No se copiaron los destinatarios adicionales de "${dto.tipo_notificacion}": ${err?.message}`);
    }
  }

  private async registrarOmision(dto: SendNotificationDto, motivo: string): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO notifications.envio_omitido (codigo_modulo, clave_evento, canal, destinatario, motivo, titulo)
         VALUES ($1, $2, 'plataforma', $3, $4, $5)`,
        [dto.modulo ?? MODULO_NOTIFICACIONES, dto.tipo_notificacion, dto.id_usuario_destinatario, motivo, (dto.titulo || '').slice(0, 255)],
      );
      this.logger.log(`[notifyByRole][DB] Omitida "${dto.tipo_notificacion}" por configuración (${motivo})`);
    } catch (err: any) {
      this.logger.warn(`[notifyByRole][DB] No se registró la omisión: ${err?.message}`);
    }
  }

  /**
   * Envía un correo electrónico mediante el servicio de notificaciones.
   * `evento` es la clave con la que la configuración de notificaciones
   * (EFDS-2406) decide si el correo sale; sin él, sale siempre.
   */
  async sendEmail(to: string, subject: string, html: string, evento?: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/v1/emails/send`, {
        to,
        subject,
        html,
        ...(evento ? { modulo: MODULO_NOTIFICACIONES, evento } : {}),
      }, { timeout: 5000 });
      this.logger.log(`Correo enviado exitosamente a ${to}`);
    } catch (err) {
      this.logger.warn(`No se pudo enviar correo a ${to}: ${err?.message}`);
    }
  }

}

/** Destinatarios que el administrador sumó al aviso (EFDS-2406, función 4). */
type Adicionales = { roles: string[]; dependencias: string[]; sedes: string[] };

/** UUID (formato v4) derivado de un texto: el mismo texto da siempre el mismo id (igual que el servicio central). */
function idDeterminista(texto: string): string {
  const h = createHash('sha1').update(texto).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
