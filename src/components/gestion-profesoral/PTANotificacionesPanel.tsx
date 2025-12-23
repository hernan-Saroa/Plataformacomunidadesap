/**
 * PANEL DE NOTIFICACIONES PTA - In-App
 * 
 * Componente visual para mostrar notificaciones persistentes in-app
 * Incluye badge de contador, panel deslizable y acciones
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Trash2,
  Filter
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import type { NotificacionPTA, PrioridadNotificacion } from '../../services/notifications/ptaNotificationsService';
import { PTANotificationsService } from '../../services/notifications/ptaNotificationsService';

interface PTANotificacionesPanelProps {
  usuarioId: string;
  onNotificacionClick?: (notificacion: NotificacionPTA) => void;
}

export function PTANotificacionesPanel({ 
  usuarioId,
  onNotificacionClick 
}: PTANotificacionesPanelProps) {
  
  const [notificaciones, setNotificaciones] = useState<NotificacionPTA[]>([]);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas' | 'alta'>('todas');
  
  // Cargar notificaciones
  useEffect(() => {
    cargarNotificaciones();
    
    // Recargar cada 30 segundos
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [usuarioId]);
  
  const cargarNotificaciones = () => {
    const notifs = PTANotificationsService.obtenerNotificacionesInApp(usuarioId);
    setNotificaciones(notifs);
  };
  
  // Filtrar notificaciones
  const notificacionesFiltradas = notificaciones.filter(n => {
    if (filtro === 'no_leidas') return !n.leida;
    if (filtro === 'alta') return n.prioridad === 'ALTA';
    return true;
  });
  
  // Contar no leídas
  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const hayNotificacionesAlta = notificaciones.some(n => !n.leida && n.prioridad === 'ALTA');
  
  // Marcar como leída
  const marcarLeida = (notificacionId: string) => {
    PTANotificationsService.marcarComoLeida(usuarioId, notificacionId);
    cargarNotificaciones();
  };
  
  // Marcar todas como leídas
  const marcarTodasLeidas = () => {
    notificaciones
      .filter(n => !n.leida)
      .forEach(n => PTANotificationsService.marcarComoLeida(usuarioId, n.id));
    cargarNotificaciones();
    toast.success('Todas las notificaciones marcadas como leídas');
  };
  
  // Eliminar notificación
  const eliminarNotificacion = (notificacionId: string) => {
    const actualizadas = notificaciones.filter(n => n.id !== notificacionId);
    localStorage.setItem(
      `pta_notifications_${usuarioId}`,
      JSON.stringify(actualizadas)
    );
    cargarNotificaciones();
    toast.success('Notificación eliminada');
  };
  
  // Manejar click en notificación
  const handleNotificacionClick = (notificacion: NotificacionPTA) => {
    marcarLeida(notificacion.id);
    onNotificacionClick?.(notificacion);
    
    // Si tiene URL de acción, navegar
    if (notificacion.url_accion) {
      window.location.href = notificacion.url_accion;
    }
  };
  
  return (
    <>
      {/* Botón de notificaciones con badge */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPanelAbierto(!panelAbierto)}
          className={`relative ${hayNotificacionesAlta ? 'animate-pulse' : ''}`}
        >
          {hayNotificacionesAlta ? (
            <BellRing className="w-5 h-5 text-red-600" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          
          {noLeidas > 0 && (
            <Badge 
              className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center p-1 text-xs ${
                hayNotificacionesAlta ? 'bg-red-600' : 'bg-blue-600'
              }`}
            >
              {noLeidas > 99 ? '99+' : noLeidas}
            </Badge>
          )}
        </Button>
      </div>
      
      {/* Panel deslizable */}
      <AnimatePresence>
        {panelAbierto && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanelAbierto(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Notificaciones PTA</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPanelAbierto(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="opacity-80">Total:</span>
                    <span className="font-bold">{notificaciones.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="opacity-80">No leídas:</span>
                    <span className="font-bold">{noLeidas}</span>
                  </div>
                  {hayNotificacionesAlta && (
                    <Badge className="bg-red-500">
                      {notificaciones.filter(n => !n.leida && n.prioridad === 'ALTA').length} urgentes
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Filtros y acciones */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <select
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="todas">Todas</option>
                      <option value="no_leidas">No leídas</option>
                      <option value="alta">Alta prioridad</option>
                    </select>
                  </div>
                  
                  {noLeidas > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={marcarTodasLeidas}
                      className="text-xs"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Lista de notificaciones */}
              <ScrollArea className="flex-1">
                {notificacionesFiltradas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Bell className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">
                      {filtro === 'no_leidas' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {notificacionesFiltradas.map((notificacion) => (
                      <NotificacionItem
                        key={notificacion.id}
                        notificacion={notificacion}
                        onClick={() => handleNotificacionClick(notificacion)}
                        onEliminar={() => eliminarNotificacion(notificacion.id)}
                        onMarcarLeida={() => marcarLeida(notificacion.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Componente individual de notificación
 */
interface NotificacionItemProps {
  notificacion: NotificacionPTA;
  onClick: () => void;
  onEliminar: () => void;
  onMarcarLeida: () => void;
}

function NotificacionItem({ 
  notificacion, 
  onClick, 
  onEliminar,
  onMarcarLeida 
}: NotificacionItemProps) {
  
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  
  // Icono según prioridad
  const IconoPrioridad = {
    ALTA: AlertTriangle,
    MEDIA: Info,
    BAJA: Clock
  }[notificacion.prioridad];
  
  // Color según prioridad
  const colorPrioridad = {
    ALTA: 'bg-red-100 border-red-300 text-red-900',
    MEDIA: 'bg-blue-100 border-blue-300 text-blue-900',
    BAJA: 'bg-gray-100 border-gray-300 text-gray-900'
  }[notificacion.prioridad];
  
  const colorIcono = {
    ALTA: 'text-red-600',
    MEDIA: 'text-blue-600',
    BAJA: 'text-gray-600'
  }[notificacion.prioridad];
  
  // Calcular tiempo transcurrido
  const tiempoTranscurrido = calcularTiempoTranscurrido(notificacion.timestamp);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setMostrarAcciones(true)}
      onHoverEnd={() => setMostrarAcciones(false)}
      className="relative"
    >
      <Card 
        className={`p-3 cursor-pointer transition-all ${
          notificacion.leida 
            ? 'bg-white border-gray-200' 
            : `${colorPrioridad} border-l-4`
        }`}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className={`mt-0.5 ${colorIcono}`}>
            <IconoPrioridad className="w-5 h-5" />
          </div>
          
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`text-sm ${notificacion.leida ? 'font-normal' : 'font-bold'}`}>
                {notificacion.asunto}
              </h4>
              {!notificacion.leida && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
              )}
            </div>
            
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {notificacion.mensaje}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {tiempoTranscurrido}
              </span>
              
              {notificacion.url_accion && (
                <ExternalLink className="w-3 h-3 text-blue-600" />
              )}
            </div>
          </div>
        </div>
        
        {/* Acciones al hover */}
        <AnimatePresence>
          {mostrarAcciones && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {!notificacion.leida && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-white/90 hover:bg-white"
                  onClick={onMarcarLeida}
                  title="Marcar como leída"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white text-red-600"
                onClick={onEliminar}
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

/**
 * Calcular tiempo transcurrido desde la notificación
 */
function calcularTiempoTranscurrido(timestamp: string): string {
  const ahora = new Date();
  const fecha = new Date(timestamp);
  const diff = ahora.getTime() - fecha.getTime();
  
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas} h`;
  if (dias < 7) return `Hace ${dias} d`;
  
  return fecha.toLocaleDateString('es-CO', { 
    day: 'numeric', 
    month: 'short' 
  });
}
