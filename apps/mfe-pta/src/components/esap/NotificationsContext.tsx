/**
 * NotificationsContext - Stub minimalista
 * 
 * Provee un contexto de notificaciones para DocumentNotificationPoller
 * y otros componentes que lo requieran.
 * 
 * @version 2.0.0
 * @date 2026-03-10
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  addNotification: () => {},
  markAsRead: () => {},
  clearAll: () => {},
  unreadCount: 0,
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, markAsRead, clearAll, unreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}
