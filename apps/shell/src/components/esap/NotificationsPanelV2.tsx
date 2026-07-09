import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Archive,
  Mail,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  Settings,
  TrendingUp,
  AlertTriangle,
  Info,
  Star
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNotifications } from './NotificationsContext';

// Types basados en tabla notificaciones
interface Notification {
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
  datos_adicionales?: any;
}

interface NotificationsPanelV2Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  compact?: boolean;
}

/**
 * Intenta manejar in-app las notificaciones cuya url_accion sigue el patrón
 * `/gestion-legal?modulo=<vista>&radicado=<...>` emitido por
 * `legal-notifications.service.ts`. En vez de recargar la página, dispara un
 * CustomEvent que `GestionLegalFull` intercepta para cambiar la vista activa y
 * abrir el modal del expediente directamente.
 *
 * Devuelve `true` si la notificación fue manejada in-app; `false` si el caller
 * debe hacer fallback a `window.location.href = url`.
 */
function tryHandleLegalNotificationInApp(
  url: string,
  notif: { datos_adicionales?: any },
): boolean {
  try {
    if (!url.startsWith('/gestion-legal')) return false;
    const queryStart = url.indexOf('?');
    if (queryStart === -1) return false;
    const params = new URLSearchParams(url.slice(queryStart + 1));
    const modulo = params.get('modulo');
    const radicado = params.get('radicado') || undefined;
    if (!modulo) return false;

    const procesoId = notif.datos_adicionales?.procesoId;
    const detail = { modulo, radicado, procesoId };

    // Si ya estamos dentro del MFE de Gestión Legal, el evento es suficiente.
    // Si no lo estamos, el shell montará el módulo y el listener se ejecuta al montar
    // — para ese caso dejamos la intención en sessionStorage como respaldo.
    sessionStorage.setItem('legal:pendingOpenExpediente', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('legal:open-expediente', { detail }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Intenta manejar in-app las notificaciones de Control Interno de Gestión
 * Soporta tanto formato con params (?seccion=...) como formato REST (/auditorias/ID)
 */
function tryHandleControlInternoNotificationInApp(
  url: string,
  notif: { datos_adicionales?: any },
): boolean {
  try {
    // 1. Validar prefijo base
    if (!url.startsWith('/control-interno')) return false;

    let seccion = 'dashboard';
    let auditoriaId = notif.datos_adicionales?.auditoriaId;
    let planId = notif.datos_adicionales?.planId;
    let fase = notif.datos_adicionales?.fase || notif.datos_adicionales?.etapa;

    // 2. Analizar por query params (formato tradicional)
    const queryStart = url.indexOf('?');
    if (queryStart !== -1) {
      const params = new URLSearchParams(url.slice(queryStart + 1));
      seccion = params.get('seccion') || seccion;
      auditoriaId = params.get('auditoriaId') || auditoriaId;
      planId = params.get('planId') || planId;
      fase = params.get('fase') || params.get('etapa') || fase;

      // Mapeo inteligente: si la seccion es una fase, redirigir al dashboard
      const fasesConocidas = ['planeacion', 'ejecucion', 'comunicacion', 'seguimiento', 'finalizada'];
      if (fasesConocidas.includes(seccion.toLowerCase())) {
        fase = seccion;
        seccion = 'dashboard';
      }
    }
    // 3. Analizar por ruta REST (formato backend automatico)
    else {
      const parts = url.split('/');
      // /control-interno/auditorias/ID -> parts: ["", "control-interno", "auditorias", "ID"]
      if (parts.includes('auditorias')) {
        seccion = 'dashboard';
        const idx = parts.indexOf('auditorias');
        if (parts[idx + 1]) auditoriaId = parts[idx + 1];
      } else if (parts.includes('planes-mejoramiento')) {
        seccion = 'planes-mejoramiento';
        const idx = parts.indexOf('planes-mejoramiento');
        if (parts[idx + 1]) planId = parts[idx + 1];
      }
    }

    const detail = { seccion, auditoriaId, planId, fase };

    sessionStorage.setItem('control-interno:pendingOpenExpediente', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('control-interno:open-expediente', { detail }));

    return true;
  } catch {
    return false;
  }
}

/**
 * Intenta manejar in-app las notificaciones del módulo PTA cuyo `url_accion`
 * sigue el patrón `/pta?ptaId=<id>` emitido por `pta-notifications.service.ts`.
 * En vez de recargar la página, dispara un CustomEvent que `PtaBackofficeModule`
 * intercepta para abrir el detalle del PTA directamente.
 */
function tryHandlePtaNotificationInApp(
  url: string,
  notif: { datos_adicionales?: any },
): boolean {
  try {
    if (!url.startsWith('/pta')) return false;
    const queryStart = url.indexOf('?');
    const params = queryStart !== -1 ? new URLSearchParams(url.slice(queryStart + 1)) : null;
    const ptaId = params?.get('ptaId') || notif.datos_adicionales?.ptaId;
    if (!ptaId) return false;

    const detail = { ptaId, componente: notif.datos_adicionales?.componente };

    sessionStorage.setItem('pta:pendingOpenDetalle', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('pta:open-detalle', { detail }));
    return true;
  } catch {
    return false;
  }
}

export function NotificationsPanelV2({
  isOpen,
  onClose
}: NotificationsPanelV2Props) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  // Usar el contexto global de notificaciones
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    toggleFavorite,
    unreadCount
  } = useNotifications();

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      AlertCircle,
      CheckCircle,
      TrendingUp,
      FileText,
      DollarSign,
      Mail,
      Calendar,
      Award,
      Clock,
      Settings,
      Bell,
      AlertTriangle,
      Info
    };
    return icons[iconName] || Bell;
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      'Crítica': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'Alta': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      'Media': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'Baja': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    };
    return configs[priority] || configs.Media;
  };

  const filteredNotifications = notifications.filter(notif => {
    if (notif.archivada) return false;
    if (filter === 'unread' && notif.leida) return false;
    if (filter === 'important') return (notif as any).es_favorito === true;
    return true;
  });

  const handleAction = (notif: Notification) => {
    // Mark as read first
    markAsRead(notif.id_notificacion);

    // Get the URL
    const url = notif.url_accion || '';
    if (!url) return;

    // Store the highlighted item ID in sessionStorage for visual highlighting
    if (notif.datos_adicionales?.terminoId) {
      sessionStorage.setItem('highlightTerminoId', notif.datos_adicionales.terminoId);
    }

    let handledInApp = tryHandleLegalNotificationInApp(url, notif);
    if (!handledInApp) {
      handledInApp = tryHandleControlInternoNotificationInApp(url, notif);
    }
    if (!handledInApp) {
      handledInApp = tryHandlePtaNotificationInApp(url, notif);
    }

    if (!handledInApp) {
      window.location.href = url;
    }
    onClose();
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return notifDate.toLocaleDateString('es-CO');
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-stretch justify-end">
          {/* Backdrop Premium con Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer/Slide-over Container - Desde la derecha */}
          <motion.div
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full sm:w-[95vw] md:w-[80vw] lg:w-[500px] xl:w-[550px] bg-white shadow-2xl overflow-hidden flex flex-col h-full rounded-none sm:rounded-l-2xl"
          >
            {/* Handle Visual (Mobile) */}
            <div className="md:hidden flex justify-center pt-2 pb-1 bg-white">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header Premium */}
            <div className="relative bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] p-5 border-b border-white/10">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all active:scale-95"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="flex items-center gap-3 mb-4 pr-10">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Notificaciones</h2>
                  <p className="text-sm text-white/80">{unreadCount} sin leer</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 flex-1 text-xs"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas
                </Button>
              </div>
            </div>

            {/* Filters - Compacto */}
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  className="flex-1 text-xs h-8"
                >
                  Todas
                  <Badge variant="secondary" className="ml-2 text-xs">{notifications.length}</Badge>
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  onClick={() => setFilter('unread')}
                  className="flex-1 text-xs h-8"
                >
                  No leídas
                  <Badge variant="secondary" className="ml-2 text-xs">{unreadCount}</Badge>
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'important' ? 'default' : 'outline'}
                  onClick={() => setFilter('important')}
                  className="flex-1 text-xs h-8"
                >
                  Importantes
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {notifications.filter(n => (n as any).es_favorito).length}
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {filteredNotifications.map((notif, index) => {
                    const Icon = getIconComponent(notif.icono);
                    const priorityConfig = getPriorityConfig(notif.prioridad);

                    return (
                      <motion.div
                        key={notif.id_notificacion}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          onClick={() => notif.url_accion && handleAction(notif as any)}
                          className={`p-4 transition-all cursor-pointer hover:shadow-md relative group ${!notif.leida ? 'border-l-4 border-l-[#1e5da8] bg-blue-50/30' : ''}`}
                        >
                          {!notif.leida && (
                            <div className="absolute top-4 right-4">
                              <div className="w-2 h-2 bg-[#1e5da8] rounded-full" />
                            </div>
                          )}

                          <div className="flex gap-3">
                            {/* Icon */}
                            <div
                              className="p-2 rounded-xl flex-shrink-0"
                              style={{ backgroundColor: `${notif.color}15` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: notif.color }} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{notif.titulo}</h4>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(notif.id_notificacion);
                                    }}
                                    className={`p-1 rounded-full transition-all ${(notif as any).es_favorito
                                        ? 'text-amber-500 hover:bg-amber-50'
                                        : 'text-gray-300 hover:text-amber-400 hover:bg-gray-100'
                                      }`}
                                  >
                                    <Star className={`w-4 h-4 ${(notif as any).es_favorito ? 'fill-current' : ''}`} />
                                  </button>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                                  >
                                    {notif.prioridad}
                                  </Badge>
                                </div>
                              </div>

                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notif.mensaje}</p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{formatTimeAgo(notif.fecha_creacion)}</span>
                                  {notif.email_enviado && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {notif.email_abierto && <span className="text-green-600 font-medium">Abierto</span>}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notif.leida && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notif.id_notificacion);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                                      title="Marcar como leída"
                                    >
                                      <Check className="w-4 h-4 text-gray-600" />
                                    </button>
                                  )}
                                  {!notif.tipo_notificacion.startsWith('termino_') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        archiveNotification(notif.id_notificacion);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                                      title="Archivar"
                                    >
                                      <Archive className="w-4 h-4 text-gray-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredNotifications.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium mb-1">No hay notificaciones</h3>
                    <p className="text-sm text-gray-600">
                      {filter === 'unread'
                        ? 'Has leído todas tus notificaciones'
                        : 'No tienes notificaciones marcadas como favoritas'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t bg-gray-50/80 backdrop-blur-sm">
              <Button
                variant="outline"
                className="w-full hover:bg-[#1e5da8] hover:text-white hover:border-[#1e5da8] transition-all text-sm h-9"
                onClick={() => console.log('Ver todas')}
              >
                Ver Todas las Notificaciones
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}