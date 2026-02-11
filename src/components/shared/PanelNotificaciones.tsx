/**
 * PANEL DE NOTIFICACIONES GLOBAL
 * Muestra todas las notificaciones de todos los módulos del sistema
 */

'use client';

import React, { useState } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNotificaciones, type Notificacion, type CategoriaNotificacion } from '../../contexts/NotificacionesContext';

interface PanelNotificacionesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PanelNotificaciones({ isOpen, onClose }: PanelNotificacionesProps) {
  const {
    notificaciones,
    notificacionesNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
  } = useNotificaciones();

  const [filtro, setFiltro] = useState<'todas' | 'control-interno' | 'no-leidas'>('todas');

  if (!isOpen) return null;

  // ============ FILTRADO ============

  const notificacionesFiltradas = notificaciones.filter((notif) => {
    if (filtro === 'todas') return true;
    if (filtro === 'control-interno') return notif.categoria === 'control-interno';
    if (filtro === 'no-leidas') return !notif.leida;
    return true;
  });

  // ============ HELPERS ============

  const obtenerIconoPorTipo = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const obtenerColorPorTipo = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-red-50 border-red-100';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const obtenerNombreCategoria = (categoria: CategoriaNotificacion) => {
    const nombres = {
      'control-interno': 'Control Interno',
      'gestion-personas': 'Gestión de Personas',
      'gestion-academica': 'Gestión Académica',
      'sistema': 'Sistema',
      'general': 'General',
    };
    return nombres[categoria] || categoria;
  };

  const formatearTiempoRelativo = (fecha: string) => {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diffMs = ahora.getTime() - fechaNotif.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace menos de 1 min';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
    return `Hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
  };

  const handleNotificacionClick = (notif: Notificacion) => {
    marcarComoLeida(notif.id);
    if (notif.url) {
      window.location.href = notif.url;
      onClose();
    }
  };

  // ============ RENDER ============

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b" style={{ backgroundColor: '#003DA5' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Notificaciones</h2>
                <p className="text-xs text-white/80">
                  {notificacionesNoLeidas} sin leer
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Acciones rápidas */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => marcarTodasComoLeidas()}
              disabled={notificacionesNoLeidas === 0}
              className="text-white hover:bg-white/10 text-xs"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marcar todas
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-3 border-b bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              size="sm"
              variant={filtro === 'todas' ? 'default' : 'outline'}
              onClick={() => setFiltro('todas')}
              className="text-xs whitespace-nowrap"
            >
              Todas
              <Badge variant="secondary" className="ml-2">
                {notificaciones.length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={filtro === 'control-interno' ? 'default' : 'outline'}
              onClick={() => setFiltro('control-interno')}
              className="text-xs whitespace-nowrap"
            >
              Control Interno
              <Badge variant="secondary" className="ml-2">
                {notificaciones.filter((n) => n.categoria === 'control-interno').length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={filtro === 'no-leidas' ? 'default' : 'outline'}
              onClick={() => setFiltro('no-leidas')}
              className="text-xs whitespace-nowrap"
            >
              No leídas
              <Badge variant="secondary" className="ml-2">
                {notificacionesNoLeidas}
              </Badge>
            </Button>
          </div>
        </div>

        {/* Lista de notificaciones */}
        <div className="flex-1 overflow-y-auto">
          {notificacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bell className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No hay notificaciones</p>
              <p className="text-sm text-gray-500 mt-1">
                {filtro === 'no-leidas'
                  ? 'Todas las notificaciones están leídas'
                  : 'Estás al día con todo'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacionesFiltradas.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 transition-colors ${
                    notif.leida ? 'bg-white' : obtenerColorPorTipo(notif.tipo)
                  } hover:bg-gray-50 cursor-pointer border-l-4 ${
                    notif.leida ? 'border-l-transparent' : 'border-l-current'
                  }`}
                  style={
                    !notif.leida
                      ? {
                          borderLeftColor:
                            notif.tipo === 'critical' || notif.tipo === 'error'
                              ? '#DC2626'
                              : notif.tipo === 'warning'
                              ? '#F59E0B'
                              : notif.tipo === 'success'
                              ? '#10B981'
                              : '#3B82F6',
                        }
                      : undefined
                  }
                  onClick={() => handleNotificacionClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono */}
                    <div className="flex-shrink-0 mt-0.5">
                      {obtenerIconoPorTipo(notif.tipo)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <h4
                            className={`text-sm font-medium ${
                              notif.leida ? 'text-gray-700' : 'text-gray-900'
                            }`}
                          >
                            {notif.titulo}
                          </h4>
                          {notif.metadata?.criticidad && (
                            <Badge
                              variant="outline"
                              className={`text-xs mt-1 ${
                                notif.metadata.criticidad === 'critica'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : notif.metadata.criticidad === 'alta'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : notif.metadata.criticidad === 'media'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}
                            >
                              {notif.metadata.criticidad}
                            </Badge>
                          )}
                        </div>
                        {!notif.leida && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                        )}
                      </div>

                      <p
                        className={`text-sm ${
                          notif.leida ? 'text-gray-500' : 'text-gray-700'
                        } line-clamp-2`}
                      >
                        {notif.descripcion}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{formatearTiempoRelativo(notif.fecha)}</span>
                        {notif.metadata?.modulo && (
                          <>
                            <span>•</span>
                            <span className="text-gray-600">{notif.metadata.modulo}</span>
                          </>
                        )}
                      </div>

                      {notif.url && (
                        <div className="mt-2">
                          <span className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                            Ver en {obtenerNombreCategoria(notif.categoria)}
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1">
                      {!notif.leida && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarComoLeida(notif.id);
                          }}
                          className="p-1 h-auto"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarNotificacion(notif.id);
                        }}
                        className="p-1 h-auto"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notificacionesFiltradas.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                // Aquí iría la navegación a ver todas las notificaciones
                console.log('Ver todas las notificaciones');
              }}
            >
              Ver Todas las Notificaciones
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
