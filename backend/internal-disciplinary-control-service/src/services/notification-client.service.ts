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

  async getUsersByRole(roleCode: string): Promise<string[]> {
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
      return users.map((u: any) => u?.user?.id_user).filter(Boolean);
    } catch (err) {
      this.logger.warn(`No se pudo obtener usuarios con rol ${roleCode}: ${err?.message}`);
      return [];
    }
  }

  async notifyByRole(roleCode: string, dto: Omit<SendNotificationDto, 'id_usuario_destinatario'>): Promise<void> {
    const userIds = await this.getUsersByRole(roleCode);
    if (!userIds.length) return;
    const notifications = userIds.map((id) => ({ ...dto, id_usuario_destinatario: id }));
    await this.sendMany(notifications);
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

  private buildAuthHeaders(): Record<string, string> | undefined {
    if (!this.internalServiceToken) {
      return undefined;
    }

    return {
      'x-internal-service-token': this.internalServiceToken,
    };
  }
}
