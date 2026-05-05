/**
 * CENTRO DE NOTIFICACIONES - ESAP
 * 
 * Componente que muestra el icono de campana con badge
 * y el panel desplegable de notificaciones.
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Eye, Edit, FileCheck } from 'lucide-react';
import { notificationService, type Notificacion, type PrioridadNotificacion } from '../../services/notificationService';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface NotificationCenterProps {
  usuarioCedula: string;
  usuarioEmail: string;
  onClickNotificacion?: (notificacion: Notificacion) => void;
}

export function NotificationCenter({ 
  usuarioCedula, 
  usuarioEmail,
  onClickNotificacion 
}: NotificationCenterProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mostrarSoloNoLeidas, setMostrarSoloNoLeidas] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Suscribirse a cambios en notificaciones
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((todasLasNotifs) => {
      // Filtrar solo las notificaciones del usuario actual
      const misNotifs = todasLasNotifs.filter(n => n.destinatarioId === usuarioCedula);
      setNotificaciones(misNotifs);
    });

    return unsubscribe;
  }, [usuarioCedula]);

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);
  const contadorNoLeidas = notificacionesNoLeidas.length;

  const notificacionesFiltradas = mostrarSoloNoLeidas 
    ? notificacionesNoLeidas 
    : notificaciones;

  const handleMarcarComoLeida = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.marcarComoLeida(notifId);
  };

  const handleMarcarTodasComoLeidas = () => {
    notificationService.marcarTodasComoLeidas(usuarioCedula);
  };

  const handleEliminar = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.eliminarNotificacion(notifId);
  };

  const handleClickNotificacion = (notificacion: Notificacion) => {
    // Marcar como leída automáticamente
    if (!notificacion.leida) {
      notificationService.marcarComoLeida(notificacion.id);
    }

    // Cerrar panel
    setIsOpen(false);

    // Ejecutar callback si existe
    if (onClickNotificacion) {
      onClickNotificacion(notificacion);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        
        {/* Badge con contador */}
        {contadorNoLeidas > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {contadorNoLeidas > 9 ? '9+' : contadorNoLeidas}
          </span>
        )}
      </button>

      {/* Panel de Notificaciones */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col animate-fadeIn"
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Notificaciones</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Filtros */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarSoloNoLeidas}
                  onChange={(e) => setMostrarSoloNoLeidas(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Solo no leídas</span>
                {contadorNoLeidas > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    {contadorNoLeidas}
                  </span>
                )}
              </label>

              {contadorNoLeidas > 0 && (
                <button
                  onClick={handleMarcarTodasComoLeidas}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas
                </button>
              )}
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="flex-1 overflow-y-auto">
            {notificacionesFiltradas.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  {mostrarSoloNoLeidas ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notificacionesFiltradas.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notificacion={notif}
                    onClick={() => handleClickNotificacion(notif)}
                    onMarcarLeida={(e) => handleMarcarComoLeida(notif.id, e)}
                    onEliminar={(e) => handleEliminar(notif.id, e)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                {notificaciones.length} notificación{notificaciones.length !== 1 ? 'es' : ''} en total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ITEM DE NOTIFICACIÓN
// ============================================================================

interface NotificationItemProps {
  notificacion: Notificacion;
  onClick: () => void;
  onMarcarLeida: (e: React.MouseEvent) => void;
  onEliminar: (e: React.MouseEvent) => void;
}

function NotificationItem({ 
  notificacion, 
  onClick, 
  onMarcarLeida, 
  onEliminar 
}: NotificationItemProps) {
  const { titulo, mensaje, prioridad, leida, fechaCreacion, tipo, accion } = notificacion;

  // Colores según prioridad
  const prioridadConfig = {
    baja: { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' },
    media: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
    alta: { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
    urgente: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-600' }
  };

  const config = prioridadConfig[prioridad];

  // Icono según tipo de notificación
  const iconoConfig = {
    'pta-enviado': { icon: FileCheck, color: 'text-blue-600' },
    'pta-aprobado-nivel1': { icon: Check, color: 'text-green-600' },
    'pta-aprobado-nivel2': { icon: Check, color: 'text-green-600' },
    'pta-aprobado-nivel3': { icon: Check, color: 'text-green-600' },
    'pta-rechazado': { icon: X, color: 'text-red-600' },
    'pta-pendiente': { icon: Bell, color: 'text-orange-600' },
    'pta-urgente': { icon: Bell, color: 'text-red-600' },
    'comentario-nuevo': { icon: Bell, color: 'text-blue-600' }
  };

  const IconoNotif = iconoConfig[tipo]?.icon || Bell;
  const colorIcono = iconoConfig[tipo]?.color || 'text-gray-600';

  // Formatear fecha relativa
  const fechaRelativa = getRelativeTime(fechaCreacion);

  // Texto del botón de acción
  const textoAccion = accion ? {
    'ver-pta': 'Ver PTA',
    'editar-pta': 'Editar PTA',
    'aprobar-pta': 'Revisar PTA'
  }[accion.tipo] : null;

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        !leida ? config.bg : 'bg-white'
      } ${!leida ? 'border-l-4 ' + config.border : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div className={`w-10 h-10 rounded-full ${!leida ? config.bg : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
          <IconoNotif className={`w-5 h-5 ${colorIcono}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-semibold ${!leida ? 'text-gray-900' : 'text-gray-700'}`}>
              {titulo}
            </h4>
            {!leida && (
              <div className={`w-2 h-2 ${config.dot} rounded-full flex-shrink-0 mt-1.5`} />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {mensaje}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {fechaRelativa}
            </span>

            <div className="flex items-center gap-1">
              {/* Botón de acción */}
              {textoAccion && (
                <span className="text-xs text-blue-600 font-medium mr-2">
                  {textoAccion} →
                </span>
              )}

              {/* Marcar como leída */}
              {!leida && (
                <button
                  onClick={onMarcarLeida}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                  title="Marcar como leída"
                >
                  <Check className="w-4 h-4 text-gray-500" />
                </button>
              )}

              {/* Eliminar */}
              <button
                onClick={onEliminar}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getRelativeTime(dateString: string): string {
  const fecha = new Date(dateString);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}