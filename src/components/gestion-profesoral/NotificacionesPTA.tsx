/**
 * SISTEMA DE NOTIFICACIONES PTA
 * 
 * Gestiona y muestra las notificaciones relacionadas con el flujo de aprobación
 * del Plan de Trabajo Académico, incluyendo envíos, aprobaciones y rechazos.
 * 
 * Requerimiento: REQ-MOD-PTA-004.3 - Notificaciones Automáticas
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle,
  XCircle,
  Send,
  Clock,
  X,
  Mail,
  ExternalLink,
  Filter,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { NotificacionPTA } from './FlujoAprobacionPTA';

interface NotificacionesPTAProps {
  notificaciones: NotificacionPTA[];
  onMarcarLeida?: (id: string) => void;
  onEliminar?: (id: string) => void;
  onVerPTA?: (ptaId: string) => void;
}

export function NotificacionesPTA({
  notificaciones,
  onMarcarLeida,
  onEliminar,
  onVerPTA
}: NotificacionesPTAProps) {
  const [filtro, setFiltro] = useState<'todas' | 'no-leidas'>('todas');
  const [tipoFiltro, setTipoFiltro] = useState<NotificacionPTA['tipo'] | 'todas'>('todas');

  const notificacionesFiltradas = notificaciones.filter(notif => {
    const cumpleFiltroLeida = filtro === 'todas' || !notif.leida;
    const cumpleFiltroTipo = tipoFiltro === 'todas' || notif.tipo === tipoFiltro;
    return cumpleFiltroLeida && cumpleFiltroTipo;
  });

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  // Iconos por tipo de notificación
  const iconoPorTipo = {
    'envio': Send,
    'aprobacion': CheckCircle,
    'rechazo': XCircle,
    'recordatorio': Clock
  };

  // Colores por tipo
  const colorPorTipo = {
    'envio': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-600'
    },
    'aprobacion': {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      badge: 'bg-green-600'
    },
    'rechazo': {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-600'
    },
    'recordatorio': {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      badge: 'bg-amber-600'
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con filtros */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-[#003DA5]" />
            {notificacionesNoLeidas > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
              >
                <span className="text-xs text-white font-bold">
                  {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
                </span>
              </motion.div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Notificaciones PTA</h3>
            <p className="text-sm text-gray-500">
              {notificacionesNoLeidas} sin leer de {notificaciones.length} totales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro de lectura */}
          <Button
            onClick={() => setFiltro(filtro === 'todas' ? 'no-leidas' : 'todas')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {filtro === 'todas' ? 'Todas' : 'No leídas'}
          </Button>

          {/* Filtro por tipo */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todas">Todos los tipos</option>
            <option value="envio">Envíos</option>
            <option value="aprobacion">Aprobaciones</option>
            <option value="rechazo">Rechazos</option>
            <option value="recordatorio">Recordatorios</option>
          </select>
        </div>
      </div>

      {/* Lista de notificaciones */}
      {notificacionesFiltradas.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No hay notificaciones</p>
          <p className="text-sm text-gray-400 mt-1">
            {filtro === 'no-leidas' 
              ? 'Todas las notificaciones han sido leídas'
              : 'No hay notificaciones disponibles'
            }
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {notificacionesFiltradas
              .sort((a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime())
              .map((notificacion, index) => {
                const Icon = iconoPorTipo[notificacion.tipo];
                const colores = colorPorTipo[notificacion.tipo];

                return (
                  <motion.div
                    key={notificacion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <Card
                      className={`p-4 transition-all ${
                        notificacion.leida 
                          ? 'bg-white border-gray-200' 
                          : `${colores.bg} border-2 ${colores.border}`
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icono */}
                        <div className={`p-2 rounded-lg ${
                          notificacion.leida ? 'bg-gray-100' : colores.bg
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            notificacion.leida ? 'text-gray-400' : colores.icon
                          }`} />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-semibold ${
                                notificacion.leida ? 'text-gray-700' : 'text-gray-900'
                              }`}>
                                {notificacion.asunto}
                              </h4>
                              {!notificacion.leida && (
                                <Badge className={`${colores.badge} text-white text-xs px-2 py-0`}>
                                  Nueva
                                </Badge>
                              )}
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {onVerPTA && (
                                <Button
                                  onClick={() => onVerPTA(notificacion.ptaId)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Ver PTA"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              {!notificacion.leida && onMarcarLeida && (
                                <Button
                                  onClick={() => onMarcarLeida(notificacion.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Marcar como leída"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {onEliminar && (
                                <Button
                                  onClick={() => onEliminar(notificacion.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Mensaje */}
                          <p className={`text-sm ${
                            notificacion.leida ? 'text-gray-600' : 'text-gray-700'
                          } whitespace-pre-line`}>
                            {notificacion.mensaje}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatearFecha(notificacion.fechaEnvio)}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{notificacion.destinatarioEmail}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * Widget compacto de notificaciones para header
 */
export function NotificacionesWidget({
  notificaciones,
  onMarcarLeida,
  onVerPTA
}: NotificacionesPTAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);

  return (
    <div className="relative">
      {/* Botón de campana */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {notificacionesNoLeidas.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
          >
            <span className="text-xs text-white font-bold">
              {notificacionesNoLeidas.length > 9 ? '9+' : notificacionesNoLeidas.length}
            </span>
          </motion.div>
        )}
      </Button>

      {/* Dropdown de notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Notificaciones</h3>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  {notificacionesNoLeidas.length} sin leer
                </p>
              </div>

              {/* Lista */}
              <div className="overflow-y-auto max-h-[400px]">
                {notificacionesNoLeidas.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p className="text-gray-600 font-medium">¡Todo al día!</p>
                    <p className="text-sm text-gray-400 mt-1">
                      No hay notificaciones pendientes
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {notificacionesNoLeidas.slice(0, 5).map((notificacion) => {
                      const Icon = iconoPorTipo[notificacion.tipo];
                      const colores = colorPorTipo[notificacion.tipo];

                      return (
                        <Card
                          key={notificacion.id}
                          className={`p-3 ${colores.bg} border ${colores.border} cursor-pointer hover:shadow-md transition-all`}
                          onClick={() => {
                            onMarcarLeida?.(notificacion.id);
                            onVerPTA?.(notificacion.ptaId);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-4 h-4 ${colores.icon} flex-shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {notificacion.asunto}
                              </p>
                              <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                {notificacion.mensaje}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatearFechaRelativa(notificacion.fechaEnvio)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notificacionesNoLeidas.length > 5 && (
                <div className="p-3 border-t bg-gray-50 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#003DA5] hover:bg-blue-50"
                    onClick={() => setIsOpen(false)}
                  >
                    Ver todas las notificaciones
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Formatea una fecha ISO a formato legible
 */
function formatearFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diff = ahora.getTime() - fecha.getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (dias === 0) {
    return `Hoy a las ${fecha.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else if (dias === 1) {
    return `Ayer a las ${fecha.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else if (dias < 7) {
    return `Hace ${dias} días`;
  } else {
    return fecha.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  }
}

/**
 * Formatea una fecha de forma relativa (hace X minutos/horas/días)
 */
function formatearFechaRelativa(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diff = ahora.getTime() - fecha.getTime();
  
  const minutos = Math.floor(diff / (1000 * 60));
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;
  
  return fecha.toLocaleDateString('es-CO', { 
    day: 'numeric', 
    month: 'short' 
  });
}
