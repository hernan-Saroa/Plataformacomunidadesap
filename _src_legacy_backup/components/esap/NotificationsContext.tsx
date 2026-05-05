/**
 * CONTEXTO GLOBAL DE NOTIFICACIONES
 * Sistema centralizado para gestionar notificaciones desde cualquier módulo
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  clearNotifications: () => void;
  unreadCount: number;
}

// ============ CONTEXTO ============

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// ============ PROVIDER ============

interface NotificationsProviderProps {
  children: ReactNode;
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
      email_abierto: false
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
      email_abierto: false
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

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id_notificacion === id 
          ? { ...notif, leida: true, fecha_lectura: new Date().toISOString() }
          : notif
      )
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, leida: true, fecha_lectura: now }))
    );
  }, []);

  // Archivar notificación
  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id_notificacion === id 
          ? { ...notif, archivada: true }
          : notif
      )
    );
  }, []);

  // Limpiar todas las notificaciones
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
    clearNotifications,
    unreadCount
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ============ HOOK ============

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  }
  return context;
}
