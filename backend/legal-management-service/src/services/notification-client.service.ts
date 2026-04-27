import { Injectable, Logger } from '@nestjs/common';
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

  constructor() {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3009';
    this.authUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    this.internalServiceToken =
      process.env.INTERNAL_SERVICE_TOKEN ??
      process.env.JWT_SECRET ??
      DEFAULT_INTERNAL_SERVICE_TOKEN;
  }

  /**
   * Obtiene los detalles de usuario (ID y correo) que tienen asignado un rol específico.
   */
  async getUsersDetailsByRole(roleCode: string): Promise<{ id_user: string; email: string }[]> {
    try {
      // Paso 1: obtener el UUID del rol a partir del code
      const rolesRes = await axios.get(`${this.authUrl}/roles`, {
        params: { limit: 200 },
        headers: this.buildAuthHeaders(),
        timeout: 3000,
      });
      const roles: any[] = rolesRes.data?.roles ?? [];
      const role = roles.find((r) => r.code === roleCode);
      if (!role) {
        this.logger.warn(`Rol con code "${roleCode}" no encontrado en auth-service`);
        return [];
      }

      // Paso 2: obtener usuarios con ese rol UUID
      const usersRes = await axios.get(`${this.authUrl}/users`, {
        params: { role: role.id, limit: 100 },
        headers: this.buildAuthHeaders(),
        timeout: 3000,
      });
      const users: any[] = usersRes.data?.data ?? [];
      return users
        .filter((u: any) => u?.user?.id_user)
        .map((u: any) => ({
          id_user: u.user.id_user,
          email: u.email,
        }));
    } catch (err) {
      this.logger.warn(`No se pudo obtener usuarios con rol ${roleCode}: ${err?.message}`);
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
    } catch (err) {
      this.logger.warn(`No se pudieron enviar ${dtos.length} notificaciones: ${err?.message}`);
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
