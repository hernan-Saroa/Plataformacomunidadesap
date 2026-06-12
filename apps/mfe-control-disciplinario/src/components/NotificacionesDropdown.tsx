/**
 * NotificacionesDropdown - MFE Control Disciplinario
 * Dropdown de notificaciones del sistema disciplinario
 * Muestra solo notificaciones del sistema (categoría DISCIPLINARIO)
 * No muestra notificaciones de auditoría
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  X,
  Briefcase,
  UserCheck,
  AlertTriangle,
  Scale,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { ScrollArea } from '@esap-mfe/shared-ui/scroll-area';
import { toast } from 'sonner';
import { notificationsService, type Notification } from '../services/api/notificationsService';
import { authService } from '../services/api/authService';

interface NotificacionesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificacionesDropdown({ isOpen, onClose }: NotificacionesDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id || '';

  const loadNotifications = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const result = await notificationsService.getUserNotifications(userId, {
        categoria: 'DISCIPLINARIO',
        limit: 50
      });
      const list = Array.isArray(result) ? result : (result.data || []);
      setNotifications(list);
    } catch {
      // Silenciar errores cuando el servicio no está disponible
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  const unreadCount = notifications.filter(n => !n.leida && !n.archivada).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id_notificacion === id ? { ...n, leida: true } : n)
    );
    try {
      await notificationsService.markAsRead(id);
    } catch {
      // Silenciar error
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    try {
      await notificationsService.markAllAsRead(userId);
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch {
      toast.error('Error al marcar notificaciones como leídas');
    }
  };

  const handleNavigate = (url?: string) => {
    if (url) {
      window.location.href = url;
    }
    onClose();
  };

  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case 'PROCESO_ASIGNADO':
      case 'PROCESO_REASIGNADO':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'SOLICITUD_REASIGNACION':
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      case 'REASIGNACION_APROBADA':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'REASIGNACION_RECHAZADA':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Scale className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'Crítica':
        return { label: 'Crítica', className: 'bg-red-100 text-red-800 border-red-200' };
      case 'Alta':
        return { label: 'Alta', className: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'Media':
        return { label: 'Media', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'Baja':
        return { label: 'Baja', className: 'bg-gray-100 text-gray-800 border-gray-200' };
      default:
        return { label: prioridad, className: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const formatDate = (fecha: string) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between"
               style={{ background: '#003DA5' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Notificaciones</h3>
                <p className="text-xs text-white/80">
                  {unreadCount} sin leer
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Acciones */}
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#003DA5] hover:bg-blue-50 h-7 font-semibold"
              >
                <Check className="w-3 h-3 mr-1" />
                Marcar todas como leídas
              </Button>
            </div>
          )}

          {/* Lista de notificaciones */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-[#003DA5] border-t-transparent rounded-full mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">Cargando notificaciones...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">No tienes notificaciones</p>
                <p className="text-xs text-gray-500 mt-1">
                  Aquí aparecerán los avisos de tus procesos asignados
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notif) => {
                  const priorityBadge = getPriorityBadge(notif.prioridad);
                  return (
                    <motion.div
                      key={notif.id_notificacion}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        notif.leida || notif.archivada
                          ? 'bg-white border-gray-100 hover:bg-gray-50'
                          : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                      }`}
                      onClick={() => handleNavigate(notif.url_accion)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icono del tipo de notificación */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getIconForType(notif.tipo_notificacion)}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-semibold text-gray-900 ${!notif.leida ? 'font-bold' : ''}`}>
                              {notif.titulo}
                            </span>
                            {!notif.leida && (
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {notif.mensaje}
                          </p>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium px-1.5 py-0.5 ${priorityBadge.className}`}
                              >
                                {priorityBadge.label}
                              </Badge>
                              <span className="text-[10px] text-gray-500">
                                {formatDate(notif.fecha_creacion)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {!notif.leida && !notif.archivada && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notif.id_notificacion);
                              }}
                              title="Marcar como leída"
                            >
                              <Check className="w-3 h-3 text-gray-600" />
                            </Button>
                          )}
                          {notif.url_accion && (
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs text-[#003DA5] hover:bg-blue-50 font-semibold"
                onClick={() => {
                  onClose();
                  toast.info('Redirigiendo a todas las notificaciones...');
                }}
              >
                <span className="flex items-center gap-2">
                  Ver todas las notificaciones
                  <ChevronRight className="w-3 h-3" />
                </span>
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
