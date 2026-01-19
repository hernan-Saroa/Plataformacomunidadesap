/**
 * Dropdown de notificaciones de Control Interno
 * Se integra con el sistema de notificaciones reales del backend
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  X,
  Check,
  FileText,
  Calendar,
  Loader2
} from 'lucide-react';
import { useNotificacionesControlInterno } from './hooks/useNotificacionesControlInterno';
import { ScrollArea } from '../../ui/scroll-area';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificacionesControlInternoDropdown({ isOpen, onClose }: Props) {
  const {
    notificaciones,
    loading,
    conteoNoLeidas,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    cargarNotificaciones,
  } = useNotificacionesControlInterno();

  // Recargar al abrir
  useEffect(() => {
    if (isOpen) {
      cargarNotificaciones();
    }
  }, [isOpen]);

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'solicitud_ampliacion_plazo':
      case 'ampliacion_plazo_aprobada':
      case 'ampliacion_plazo_rechazada':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'hallazgo_nuevo':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'plan_mejoramiento_aprobado':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'alta':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'media':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      default:
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    }
  };

  const formatearFecha = (fecha: string): string => {
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - fechaObj.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (horas < 1) return 'Hace un momento';
    if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    return fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const handleMarcarLeida = async (id: string) => {
    await marcarLeida(id);
  };

  const handleEliminar = async (id: string) => {
    await eliminarNotificacion(id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 top-16 w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-violet-600" />
                  <h3 className="font-bold text-gray-900">Notificaciones Control Interno</h3>
                </div>
                {conteoNoLeidas > 0 && (
                  <Badge className="bg-red-500 text-white font-bold">
                    {conteoNoLeidas}
                  </Badge>
                )}
              </div>

              {conteoNoLeidas > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={marcarTodasLeidas}
                  className="w-full justify-start text-xs text-violet-600 hover:bg-violet-100 h-8 font-semibold"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>

            {/* Lista */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">No tienes notificaciones</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Aquí aparecerán las notificaciones de Control Interno
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {notificaciones.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        !notif.leida
                          ? getColorPrioridad(notif.prioridad) + ' border-l-4'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => !notif.leida && handleMarcarLeida(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIconoTipo(notif.tipoNotificacion)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                              {notif.titulo}
                            </h4>
                            {!notif.leida && (
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {notif.mensaje}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatearFecha(notif.createdAt)}
                            </span>

                            <div className="flex items-center gap-1">
                              {!notif.leida && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarcarLeida(notif.id);
                                  }}
                                  className="p-1 hover:bg-white rounded transition-colors"
                                  title="Marcar como leída"
                                >
                                  <Check className="w-3 h-3 text-green-600" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminar(notif.id);
                                }}
                                className="p-1 hover:bg-white rounded transition-colors"
                                title="Eliminar"
                              >
                                <X className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-full text-xs font-semibold"
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
