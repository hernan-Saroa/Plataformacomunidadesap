/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO DE NOTIFICACIONES - CONTROL INTERNO ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Conecta el frontend con el backend de notificaciones.
 * Endpoints:
 * - GET    /notificaciones/usuario/:usuarioId        - Todas las notificaciones
 * - GET    /notificaciones/usuario/:usuarioId/no-leidas  - Solo no leídas
 * - GET    /notificaciones/usuario/:usuarioId/conteo     - Conteo no leídas
 * - PUT    /notificaciones/:id/leida                 - Marcar como leída
 * - PUT    /notificaciones/usuario/:usuarioId/todas-leidas  - Marcar todas leídas
 * - DELETE /notificaciones/:id                       - Eliminar notificación
 * - PUT    /notificaciones/:id/archivar              - Archivar notificación
 */

import { getServiceUrl, API_MODE } from '../../../../config/environment';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type TipoNotificacion = 
  | 'anuncio_auditoria'
  | 'recordatorio_plazo'
  | 'alerta_vencimiento'
  | 'hallazgo_identificado'
  | 'solicitud_evidencia'
  | 'recepcion_documento'
  | 'aprobacion_plan'
  | 'rechazo_plan'
  | 'controversia_hallazgo'
  | 'validacion_evidencia'
  | 'solicitud_ampliacion_plazo'
  | 'ampliacion_plazo_aprobada'
  | 'ampliacion_plazo_rechazada'
  | 'otro';

export type EstadoNotificacion = 'pendiente' | 'enviada' | 'leida' | 'archivada';
export type CanalNotificacion = 'email' | 'sistema' | 'ambos';
export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'critica';

export interface NotificacionBackend {
  id: string;
  usuarioId: string;
  tipoNotificacion: TipoNotificacion;
  titulo: string;
  mensaje: string;
  estado: EstadoNotificacion;
  canal: CanalNotificacion;
  leida: boolean;
  fechaLectura?: string;
  enviadaEmail: boolean;
  fechaEnvioEmail?: string;
  metadata?: {
    auditoriaId?: string;
    hallazgoId?: string;
    planMejoramientoId?: string;
    planAnualId?: string;
    documentoId?: string;
    fechaVencimiento?: string;
    diasAnticipacion?: number;
    año?: number;
    estadoAnterior?: string;
    nuevoEstado?: string;
    responsable?: string;
    [key: string]: any;
  };
  accionUrl?: string;
  prioridad: PrioridadNotificacion;
  createdAt: string;
  updatedAt: string;
}

// Tipo para el frontend (simplificado)
export interface NotificacionFrontend {
  id: string;
  tipo: 'info' | 'exito' | 'advertencia' | 'error' | 'recordatorio';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  origen: string;
  prioridad: PrioridadNotificacion;
  accion?: {
    texto: string;
    url: string;
  };
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FiltrosNotificacion {
  estado?: string;
  tipo?: string;
  leida?: boolean;
  prioridad?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const BASE_URL = getServiceUrl('control-institucional');
const API_BASE_URL = API_MODE === 'gateway' 
  ? `${BASE_URL}/control-institucional/api/v1` 
  : BASE_URL;
const NOTIFICACIONES_ENDPOINT = '/notificaciones';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER PARA REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Error ${response.status}`,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('[NotificacionesService] API Request Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión con el servidor',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPEO DE TIPOS BACKEND → FRONTEND
// ═══════════════════════════════════════════════════════════════════════════

function mapearTipoNotificacion(tipo: TipoNotificacion): NotificacionFrontend['tipo'] {
  const mapeo: Record<TipoNotificacion, NotificacionFrontend['tipo']> = {
    'anuncio_auditoria': 'info',
    'recordatorio_plazo': 'recordatorio',
    'alerta_vencimiento': 'advertencia',
    'hallazgo_identificado': 'advertencia',
    'solicitud_evidencia': 'info',
    'recepcion_documento': 'info',
    'aprobacion_plan': 'exito',
    'rechazo_plan': 'error',
    'controversia_hallazgo': 'advertencia',
    'validacion_evidencia': 'exito',
    'solicitud_ampliacion_plazo': 'info',
    'ampliacion_plazo_aprobada': 'exito',
    'ampliacion_plazo_rechazada': 'error',
    'otro': 'info',
  };
  return mapeo[tipo] || 'info';
}

function mapearOrigenNotificacion(tipo: TipoNotificacion): string {
  const mapeo: Record<TipoNotificacion, string> = {
    'anuncio_auditoria': 'Auditorías',
    'recordatorio_plazo': 'Sistema de Seguimiento',
    'alerta_vencimiento': 'Alertas de Vencimiento',
    'hallazgo_identificado': 'Hallazgos',
    'solicitud_evidencia': 'Validación de Evidencias',
    'recepcion_documento': 'Gestión Documental',
    'aprobacion_plan': 'Aprobaciones',
    'rechazo_plan': 'Aprobaciones',
    'controversia_hallazgo': 'Hallazgos',
    'validacion_evidencia': 'Validación de Evidencias',
    'solicitud_ampliacion_plazo': 'Ampliaciones de Plazo',
    'ampliacion_plazo_aprobada': 'Ampliaciones de Plazo',
    'ampliacion_plazo_rechazada': 'Ampliaciones de Plazo',
    'otro': 'Sistema',
  };
  return mapeo[tipo] || 'Sistema';
}

function mapearTextoAccion(tipo: TipoNotificacion): string {
  const mapeo: Record<TipoNotificacion, string> = {
    'anuncio_auditoria': 'Ver Auditoría',
    'recordatorio_plazo': 'Ir al Seguimiento',
    'alerta_vencimiento': 'Ver Detalle',
    'hallazgo_identificado': 'Ver Hallazgo',
    'solicitud_evidencia': 'Cargar Evidencia',
    'recepcion_documento': 'Ver Documento',
    'aprobacion_plan': 'Ver Plan',
    'rechazo_plan': 'Ver Observaciones',
    'controversia_hallazgo': 'Ver Controversia',
    'validacion_evidencia': 'Ver Evidencia',
    'solicitud_ampliacion_plazo': 'Revisar Solicitud',
    'ampliacion_plazo_aprobada': 'Ver Detalle',
    'ampliacion_plazo_rechazada': 'Ver Motivo',
    'otro': 'Ver Más',
  };
  return mapeo[tipo] || 'Ver Más';
}

/**
 * Transforma notificación del backend al formato del frontend
 */
export function transformarNotificacion(notif: NotificacionBackend): NotificacionFrontend {
  return {
    id: notif.id,
    tipo: mapearTipoNotificacion(notif.tipoNotificacion),
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    fecha: notif.createdAt,
    leida: notif.leida,
    origen: mapearOrigenNotificacion(notif.tipoNotificacion),
    prioridad: notif.prioridad,
    accion: notif.accionUrl ? {
      texto: mapearTextoAccion(notif.tipoNotificacion),
      url: notif.accionUrl,
    } : undefined,
    metadata: notif.metadata,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API DE NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════

export const notificacionesApi = {
  /**
   * Obtiene todas las notificaciones del usuario actual
   */
  getAll: async (usuarioId: string, filtros?: FiltrosNotificacion): Promise<ApiResponse<NotificacionFrontend[]>> => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.leida !== undefined) params.append('leida', String(filtros.leida));
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
    
    const query = params.toString();
    const response = await apiRequest<NotificacionBackend[]>(
      `${NOTIFICACIONES_ENDPOINT}/usuario/${usuarioId}${query ? `?${query}` : ''}`
    );
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.map(transformarNotificacion),
      };
    }
    return { success: false, error: response.error };
  },

  /**
   * Obtiene notificaciones no leídas
   */
  getNoLeidas: async (usuarioId: string): Promise<ApiResponse<NotificacionFrontend[]>> => {
    const response = await apiRequest<NotificacionBackend[]>(
      `${NOTIFICACIONES_ENDPOINT}/usuario/${usuarioId}/no-leidas`
    );
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.map(transformarNotificacion),
      };
    }
    return { success: false, error: response.error };
  },

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  getConteo: async (usuarioId: string): Promise<ApiResponse<number>> => {
    return apiRequest<number>(`${NOTIFICACIONES_ENDPOINT}/usuario/${usuarioId}/conteo`);
  },

  /**
   * Marca una notificación como leída
   */
  marcarLeida: async (id: string, usuarioId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${NOTIFICACIONES_ENDPOINT}/${id}/leida`, {
      method: 'PUT',
      body: JSON.stringify({ usuarioId }),
    });
  },

  /**
   * Marca todas las notificaciones como leídas
   */
  marcarTodasLeidas: async (usuarioId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${NOTIFICACIONES_ENDPOINT}/usuario/${usuarioId}/todas-leidas`, {
      method: 'PUT',
    });
  },

  /**
   * Elimina una notificación
   */
  eliminar: async (id: string, usuarioId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${NOTIFICACIONES_ENDPOINT}/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ usuarioId }),
    });
  },

  /**
   * Archiva una notificación
   */
  archivar: async (id: string, usuarioId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${NOTIFICACIONES_ENDPOINT}/${id}/archivar`, {
      method: 'PUT',
      body: JSON.stringify({ usuarioId }),
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PARA USAR EN COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<NotificacionFrontend[]>([]);
  const [conteoNoLeidas, setConteoNoLeidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener usuarioId desde el cache de autenticación en memoria
  const getUsuarioId = useCallback((): string => {
    try {
      const user = (window as any).__esap_auth_cache;
      if (user) {
        return user.id || user.userId || user.id_tercero || '';
      }
    } catch {
      console.warn('[useNotificaciones] No se pudo obtener usuario del cache');
    }
    return '';
  }, []);

  const usuarioId = getUsuarioId();

  const cargarNotificaciones = useCallback(async () => {
    if (!usuarioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const [notifResponse, conteoResponse] = await Promise.all([
        notificacionesApi.getAll(usuarioId),
        notificacionesApi.getConteo(usuarioId),
      ]);

      if (notifResponse.success && notifResponse.data) {
        setNotificaciones(notifResponse.data);
      } else {
        setError(notifResponse.error || 'Error al cargar notificaciones');
      }

      if (conteoResponse.success && typeof conteoResponse.data === 'number') {
        setConteoNoLeidas(conteoResponse.data);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  const marcarComoLeida = useCallback(async (id: string) => {
    if (!usuarioId) return false;
    
    const response = await notificacionesApi.marcarLeida(id, usuarioId);
    if (response.success) {
      setNotificaciones(prev => prev.map(n => 
        n.id === id ? { ...n, leida: true } : n
      ));
      setConteoNoLeidas(prev => Math.max(0, prev - 1));
      return true;
    }
    return false;
  }, [usuarioId]);

  const marcarTodasLeidas = useCallback(async () => {
    if (!usuarioId) return false;
    
    const response = await notificacionesApi.marcarTodasLeidas(usuarioId);
    if (response.success) {
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setConteoNoLeidas(0);
      return true;
    }
    return false;
  }, [usuarioId]);

  const eliminarNotificacion = useCallback(async (id: string) => {
    if (!usuarioId) return false;
    
    const notif = notificaciones.find(n => n.id === id);
    const response = await notificacionesApi.eliminar(id, usuarioId);
    if (response.success) {
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.leida) {
        setConteoNoLeidas(prev => Math.max(0, prev - 1));
      }
      return true;
    }
    return false;
  }, [usuarioId, notificaciones]);

  // Cargar al montar
  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  // Refrescar cada 60 segundos
  useEffect(() => {
    const interval = setInterval(cargarNotificaciones, 60000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  return {
    notificaciones,
    conteoNoLeidas,
    loading,
    error,
    refetch: cargarNotificaciones,
    marcarComoLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    usuarioId,
  };
}

export default notificacionesApi;
