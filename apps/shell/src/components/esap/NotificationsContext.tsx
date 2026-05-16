/**
 * CONTEXTO GLOBAL DE NOTIFICACIONES
 * Sistema centralizado para gestionar notificaciones desde cualquier módulo
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { notificationsService, Notification as ApiNotification } from '../../services/api/notificationsService';
import { authService } from '../../services/api/authService';
import { API_MODE } from '../../config/environment';

const REMOTE_NOTIFICATIONS_ENABLED = true;

// ============ TIPOS ============

export interface GlobalNotification {
  id_notificacion: string;
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
  tiene_accion: boolean;
  texto_boton_accion?: string;
  url_accion?: string;
  email_enviado: boolean;
  email_abierto: boolean;
  es_favorito: boolean;
  // Campos adicionales para notificaciones de Control Interno
  modulo_origen?: string;
  datos_adicionales?: any;
}

interface NotificationsContextType {
  notifications: GlobalNotification[];
  addNotification: (notification: Omit<GlobalNotification, 'id_notificacion' | 'fecha_creacion' | 'leida' | 'archivada' | 'email_enviado' | 'email_abierto'>) => void;
  addNotifications: (notifications: Omit<GlobalNotification, 'id_notificacion' | 'fecha_creacion' | 'leida' | 'archivada' | 'email_enviado' | 'email_abierto'>[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  archiveNotification: (id: string) => void;
  toggleFavorite: (id: string) => Promise<void>;
  clearNotifications: () => void;
  unreadCount: number;
}

declare global {
  interface Window {
    __ESAP_NOTIFICATIONS_CONTEXT__?: NotificationsContextType;
  }
}

// ============ CONTEXTO ============

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// ============ PROVIDER ============

interface NotificationsProviderProps {
  children: ReactNode;
}

function mapApiNotification(n: ApiNotification): GlobalNotification {
  return {
    id_notificacion: n.id_notificacion,
    tipo_notificacion: n.tipo_notificacion,
    titulo: n.titulo,
    mensaje: n.mensaje,
    descripcion_corta: n.descripcion_corta,
    icono: n.icono,
    color: n.color,
    prioridad: n.prioridad,
    categoria: n.categoria,
    leida: n.leida,
    archivada: n.archivada,
    fecha_creacion: n.fecha_creacion,
    fecha_lectura: n.fecha_lectura,
    tiene_accion: n.tiene_accion,
    texto_boton_accion: n.texto_boton_accion,
    url_accion: n.url_accion,
    email_enviado: n.email_enviado,
    email_abierto: n.email_abierto,
    es_favorito: n.es_favorito ?? false,
    datos_adicionales: n.datos_adicionales,
  };
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);

  // Agregar una notificación
  const addNotification = useCallback((
    notification: Omit<GlobalNotification, 'id_notificacion' | 'fecha_creacion' | 'leida' | 'archivada' | 'email_enviado' | 'email_abierto'>
  ) => {
    const newNotification: GlobalNotification = {
      ...notification,
      id_notificacion: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fecha_creacion: new Date().toISOString(),
      leida: false,
      archivada: false,
      email_enviado: false,
      email_abierto: false,
      es_favorito: false
    };

    setNotifications(prev => {
      // Evitar duplicados basados en título y mensaje
      const exists = prev.some(n =>
        n.titulo === newNotification.titulo &&
        n.mensaje === newNotification.mensaje &&
        !n.archivada
      );

      if (exists) return prev;

      return [newNotification, ...prev];
    });
  }, []);

  // Agregar múltiples notificaciones (batch)
  const addNotifications = useCallback((
    notificationsList: Omit<GlobalNotification, 'id_notificacion' | 'fecha_creacion' | 'leida' | 'archivada' | 'email_enviado' | 'email_abierto'>[]
  ) => {
    const newNotifications: GlobalNotification[] = notificationsList.map((notification, index) => ({
      ...notification,
      id_notificacion: `notif-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      fecha_creacion: new Date().toISOString(),
      leida: false,
      archivada: false,
      email_enviado: false,
      email_abierto: false,
      es_favorito: false
    }));

    setNotifications(prev => {
      // Filtrar duplicados
      const filtered = newNotifications.filter(newNotif =>
        !prev.some(existingNotif =>
          existingNotif.titulo === newNotif.titulo &&
          existingNotif.mensaje === newNotif.mensaje &&
          !existingNotif.archivada
        )
      );

      return [...filtered, ...prev];
    });
  }, []);

  const consecutiveFailures = useRef<number>(0);

  // Cargar notificaciones desde el backend
  const loadNotifications = useCallback(async () => {
    if (!REMOTE_NOTIFICATIONS_ENABLED) return;

    // Si ha fallado repetidamente, pausar el polling para evitar spam en la consola
    if (consecutiveFailures.current >= 3) return;

    const user = authService.getCurrentUser();
    if (!user?.id) return;
    try {
      const result = await notificationsService.getUserNotifications(user.id, { limit: 50 });
      const list = Array.isArray(result) ? result : (result.data || []);
      const mapped = list.map(mapApiNotification);
      setNotifications(mapped);
      consecutiveFailures.current = 0; // Reiniciar contador de fallos si tiene éxito
    } catch {
      consecutiveFailures.current += 1;
      // Silencioso cuando el servicio no está disponible
    }
  }, []);

  // Carga inicial: espera a que el usuario esté en localStorage (máx 5 intentos)
  useEffect(() => {
    if (!REMOTE_NOTIFICATIONS_ENABLED) return;

    let attempts = 0;
    const tryLoad = () => {
      const user = authService.getCurrentUser();
      if (user?.id) {
        loadNotifications();
        return;
      }
      attempts++;
      if (attempts < 5) setTimeout(tryLoad, 1000);
    };
    tryLoad();
  }, [loadNotifications]);

  // Polling cada 30 segundos para actualizar el badge
  useEffect(() => {
    if (!REMOTE_NOTIFICATIONS_ENABLED) return;

    const interval = setInterval(() => {
      if (consecutiveFailures.current < 3) {
        loadNotifications();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id_notificacion === id
          ? { ...notif, leida: true, fecha_lectura: new Date().toISOString() }
          : notif
      )
    );
    notificationsService.markAsRead(id).catch(() => { });
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    const user = authService.getCurrentUser();
    const now = new Date().toISOString();
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, leida: true, fecha_lectura: now }))
    );
    if (user?.id) notificationsService.markAllAsRead(user.id).catch(() => { });
  }, []);

  // Archivar notificación
  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id_notificacion === id ? { ...notif, archivada: true } : notif
      )
    );
    notificationsService.archive(id).catch(() => { });
  }, []);

  // Marcar/Desmarcar como favorito
  const toggleFavorite = useCallback(async (id: string) => {
    // 1. Actualización optimista inmediata
    setNotifications(prev =>
      prev.map(notif =>
        notif.id_notificacion === id ? { ...notif, es_favorito: !notif.es_favorito } : notif
      )
    );

    try {
      const result = await notificationsService.toggleFavorite(id);
      
      // 2. Sincronizar con el dato real del servidor (sin recargar todo)
      if (result && typeof result.es_favorito === 'boolean') {
        setNotifications(prev => prev.map(n => 
          n.id_notificacion === id ? { ...n, es_favorito: result.es_favorito } : n
        ));
      }
    } catch (error: any) {
      console.error('[NotificationsContext] ❌ Error en toggleFavorite:', error);
      // Revertir solo si falló la red o el servidor
      setNotifications(prev =>
        prev.map(notif =>
          notif.id_notificacion === id ? { ...notif, es_favorito: !notif.es_favorito } : notif
        )
      );
    }
  }, []);

  // Limpiar todas las notificaciones (solo local)
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Contador de no leídas
  const unreadCount = notifications.filter(n => !n.leida && !n.archivada).length;

  const value: NotificationsContextType = {
    notifications,
    addNotification,
    addNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    toggleFavorite,
    clearNotifications,
    unreadCount
  };

  if (typeof window !== 'undefined') {
    window.__ESAP_NOTIFICATIONS_CONTEXT__ = value;
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ============ HOOK ============

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context) {
    return context;
  }

  if (typeof window !== 'undefined' && window.__ESAP_NOTIFICATIONS_CONTEXT__) {
    return window.__ESAP_NOTIFICATIONS_CONTEXT__;
  }

  throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
}
