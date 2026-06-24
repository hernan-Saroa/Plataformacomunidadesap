import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/notificaciones/api/v1';

// Types
export interface Notification {
  id_notificacion: string;
  id_usuario_destinatario: string;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  descripcion_corta: string;
  icono: string;
  color: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  categoria: string;
  leida: boolean;
  archivada: boolean;
  fecha_creacion: string;
  fecha_lectura?: string;
  fecha_archivado?: string;
  tiene_accion: boolean;
  texto_boton_accion?: string;
  url_accion?: string;
  datos_adicionales?: Record<string, any>;
  email_enviado: boolean;
  email_entregado: boolean;
  email_abierto: boolean;
  email_click: boolean;
  fecha_envio_email?: string;
  fecha_apertura_email?: string;
}

export interface CreateNotificationData {
  id_usuario_destinatario: string;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  descripcion_corta?: string;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  categoria?: string;
  tiene_accion?: boolean;
  texto_boton_accion?: string;
  url_accion?: string;
  datos_adicionales?: Record<string, any>;
  enviar_email?: boolean;
}

export const notificationsService = {
  /**
   * Obtener notificaciones de un usuario
   */
  getUserNotifications: async (
    userId: string,
    params?: {
      solo_no_leidas?: boolean;
      categoria?: string;
      prioridad?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: Notification[]; total: number; no_leidas: number }> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/${userId}/notifications`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Obtener notificaciones no leídas
   */
  getUnread: async (userId: string): Promise<Notification[]> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/${userId}/notifications/unread`);
      return response.data;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  },

  /**
   * Obtener contador de no leídas
   */
  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/${userId}/notifications/unread/count`);
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  /**
   * Marcar una notificación como leída
   */
  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.put(`${SERVICE_PREFIX}/notifications/${notificationId}/mark-read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead: async (userId: string): Promise<{ success: boolean; count: number }> => {
    try {
      const response = await apiClient.put(`${SERVICE_PREFIX}/users/${userId}/notifications/mark-all-read`);
      return response.data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  /**
   * Archivar una notificación
   */
  archive: async (notificationId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.put(`${SERVICE_PREFIX}/notifications/${notificationId}/archive`);
      return response.data;
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  },

  /**
   * Eliminar una notificación
   */
  delete: async (notificationId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.delete(`${SERVICE_PREFIX}/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva notificación
   */
  create: async (data: CreateNotificationData): Promise<Notification> => {
    try {
      const response = await apiClient.post(`${SERVICE_PREFIX}/notifications`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  /**
   * Crear notificaciones en masa
   */
  createBulk: async (notifications: CreateNotificationData[]): Promise<{
    success: boolean;
    created: number
  }> => {
    try {
      const response = await apiClient.post(`${SERVICE_PREFIX}/notifications/bulk`, { notifications });
      return response.data;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  },

  /**
   * Registrar apertura de email
   */
  trackEmailOpen: async (notificationId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post(`${SERVICE_PREFIX}/notifications/${notificationId}/track/email-open`);
      return response.data;
    } catch (error) {
      console.error('Error tracking email open:', error);
      throw error;
    }
  },

  /**
   * Registrar click en email
   */
  trackEmailClick: async (notificationId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post(`${SERVICE_PREFIX}/notifications/${notificationId}/track/email-click`);
      return response.data;
    } catch (error) {
      console.error('Error tracking email click:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de notificaciones
   */
  getStats: async (userId?: string): Promise<{
    total_enviadas: number;
    total_leidas: number;
    tasa_lectura: number;
    tasa_apertura_email: number;
    notificaciones_por_categoria: Record<string, number>;
    notificaciones_por_prioridad: Record<string, number>;
  }> => {
    try {
      const url = userId
        ? `${SERVICE_PREFIX}/users/${userId}/notifications/stats`
        : `${SERVICE_PREFIX}/notifications/stats`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  },

  /**
   * Obtener preferencias de notificación del usuario
   */
  getPreferences: async (userId: string): Promise<{
    email_habilitado: boolean;
    categorias_habilitadas: string[];
    frecuencia_resumen: 'inmediato' | 'diario' | 'semanal';
  }> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/${userId}/notification-preferences`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  },

  /**
   * Disparar un evento de notificación de alto nivel (el backend resuelve todo)
   */
  triggerEvent: async (eventoCode: string, context: any): Promise<any> => {
    try {
      // Usar el prefijo correcto del servicio de control institucional
      const response = await apiClient.post('/control-institucional/api/v1/notificaciones/disparar-evento', {
        eventoCode,
        context
      });
      return response.data;
    } catch (error) {
      console.error(`Error triggering event ${eventoCode}:`, error);
      throw error;
    }
  },
  /**
   * Actualizar preferencias de notificación
   */
  updatePreferences: async (
    userId: string,
    preferences: {
      email_habilitado?: boolean;
      categorias_habilitadas?: string[];
      frecuencia_resumen?: 'inmediato' | 'diario' | 'semanal';
    }
  ): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.put(
        `${SERVICE_PREFIX}/users/${userId}/notification-preferences`,
        preferences
      );
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
};

export default notificationsService;
