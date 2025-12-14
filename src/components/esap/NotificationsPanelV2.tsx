import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Archive,
  Filter,
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
  ChevronRight
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'react-toastify';

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
}

interface NotificationsPanelV2Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  compact?: boolean;
}

export function NotificationsPanelV2({ 
  userId, 
  isOpen, 
  onClose,
  compact = false 
}: NotificationsPanelV2Props) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Mock data - En producción vendría de la API
  const notifications: Notification[] = [
    {
      id_notificacion: '1',
      tipo_notificacion: 'perfil_incompleto',
      titulo: 'Completa tu perfil',
      mensaje: 'Tu perfil está al 65%. Completa los campos faltantes para acceder a todos los servicios.',
      descripcion_corta: 'Faltan documentos por subir',
      icono: 'AlertCircle',
      color: '#f59e0b',
      prioridad: 'Alta',
      categoria: 'perfil',
      leida: false,
      archivada: false,
      fecha_creacion: '2025-11-17T10:30:00',
      tiene_accion: true,
      texto_boton_accion: 'Completar Perfil',
      url_accion: '/profile/complete',
      email_enviado: true,
      email_abierto: false
    },
    {
      id_notificacion: '2',
      tipo_notificacion: 'nueva_calificacion',
      titulo: 'Nueva calificación publicada',
      mensaje: 'Se ha publicado la calificación de Administración Pública I: 4.5',
      descripcion_corta: 'Administración Pública I',
      icono: 'TrendingUp',
      color: '#10b981',
      prioridad: 'Media',
      categoria: 'academico',
      leida: false,
      archivada: false,
      fecha_creacion: '2025-11-17T09:15:00',
      tiene_accion: true,
      texto_boton_accion: 'Ver Calificación',
      url_accion: '/grades',
      email_enviado: true,
      email_abierto: true
    },
    {
      id_notificacion: '3',
      tipo_notificacion: 'certificado_listo',
      titulo: 'Certificado listo para descarga',
      mensaje: 'Tu certificado de notas está disponible para descargar',
      descripcion_corta: 'Certificado de Notas',
      icono: 'FileText',
      color: '#1e5da8',
      prioridad: 'Media',
      categoria: 'academico',
      leida: true,
      archivada: false,
      fecha_creacion: '2025-11-16T14:20:00',
      fecha_lectura: '2025-11-16T15:00:00',
      tiene_accion: true,
      texto_boton_accion: 'Descargar',
      url_accion: '/certificates/download/123',
      email_enviado: true,
      email_abierto: true
    },
    {
      id_notificacion: '4',
      tipo_notificacion: 'pago_procesado',
      titulo: 'Pago procesado exitosamente',
      mensaje: 'Se ha procesado tu pago de matrícula por $1.500.000',
      descripcion_corta: 'Matrícula Semestre 2025-2',
      icono: 'DollarSign',
      color: '#10b981',
      prioridad: 'Alta',
      categoria: 'financiero',
      leida: true,
      archivada: false,
      fecha_creacion: '2025-11-15T11:00:00',
      fecha_lectura: '2025-11-15T11:05:00',
      tiene_accion: true,
      texto_boton_accion: 'Ver Comprobante',
      url_accion: '/payments/receipt/456',
      email_enviado: true,
      email_abierto: true
    }
  ];

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
      Bell
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
    if (filter === 'unread' && notif.leida) return false;
    if (filter === 'important' && notif.prioridad !== 'Alta' && notif.prioridad !== 'Crítica') return false;
    if (categoryFilter !== 'all' && notif.categoria !== categoryFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;
  const categories = Array.from(new Set(notifications.map(n => n.categoria)));

  const handleMarkAsRead = (id: string) => {
    // API call aquí
    toast.success('Notificación marcada como leída');
  };

  const handleMarkAllAsRead = () => {
    // API call aquí
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const handleArchive = (id: string) => {
    // API call aquí
    toast.success('Notificación archivada');
  };

  const handleAction = (url: string) => {
    // Navegación aquí
    toast.info('Redirigiendo...');
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full md:w-[400px] lg:w-[450px] bg-white shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-full rounded-t-3xl md:rounded-none"
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
                aria-label="Cerrar notificaciones"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="flex items-center gap-3 mb-4 pr-10">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Notificaciones</h2>
                  <p className="text-sm text-white/80">
                    {unreadCount} sin leer
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 flex-1 text-xs"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 px-3"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters - Compacto */}
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  className="flex-1 text-xs h-8"
                >
                  Todas
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {notifications.length}
                  </Badge>
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  onClick={() => setFilter('unread')}
                  className="flex-1 text-xs h-8"
                >
                  No leídas
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {unreadCount}
                  </Badge>
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'important' ? 'default' : 'outline'}
                  onClick={() => setFilter('important')}
                  className="flex-1 text-xs h-8"
                >
                  Importantes
                </Button>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-[#1e5da8] text-white'
                      : 'bg-white border hover:bg-gray-50'
                  }`}
                >
                  Todas
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs capitalize whitespace-nowrap transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#1e5da8] text-white'
                        : 'bg-white border hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List - Scroll Area */}
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
                        className={`group relative ${!notif.leida ? 'bg-blue-50/50' : ''}`}
                      >
                        <Card className={`p-4 hover:shadow-md transition-all ${
                          !notif.leida ? 'border-l-4 border-l-[#1e5da8]' : ''
                        }`}>
                          {/* Unread indicator */}
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
                              <Icon 
                                className="w-5 h-5" 
                                style={{ color: notif.color }}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-sm">{notif.titulo}</h4>
                                <Badge 
                                  variant="outline"
                                  className={`text-xs ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                                >
                                  {notif.prioridad}
                                </Badge>
                              </div>

                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {notif.mensaje}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{formatTimeAgo(notif.fecha_creacion)}</span>
                                  {notif.email_enviado && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {notif.email_abierto && (
                                        <span className="text-green-600">Abierto</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notif.leida && (
                                    <button
                                      onClick={() => handleMarkAsRead(notif.id_notificacion)}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                                      title="Marcar como leída"
                                    >
                                      <Check className="w-4 h-4 text-gray-600" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleArchive(notif.id_notificacion)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title="Archivar"
                                  >
                                    <Archive className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              </div>

                              {/* Action Button */}
                              {notif.tiene_accion && (
                                <button
                                  onClick={() => handleAction(notif.url_accion || '')}
                                  className="mt-3 w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors group/btn"
                                >
                                  <span className="font-medium text-[#1e5da8]">
                                    {notif.texto_boton_accion}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-[#1e5da8] group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                              )}
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
                        : 'No tienes notificaciones en esta categoría'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Compacto */}
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