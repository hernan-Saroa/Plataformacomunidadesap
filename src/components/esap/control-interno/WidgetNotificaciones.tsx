/**
 * WIDGET DE NOTIFICACIONES - CONTROL INTERNO
 * Integrado con el sistema global de notificaciones
 */

'use client';

import React from 'react';
import { Bell, AlertTriangle, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useNotificaciones } from '../../../contexts/NotificacionesContext';

export function WidgetNotificaciones() {
  const { obtenerPorCategoria, obtenerNoLeidasPorCategoria } = useNotificaciones();

  const notificacionesControlInterno = obtenerPorCategoria('control-interno');
  const noLeidas = obtenerNoLeidasPorCategoria('control-interno');

  // Mostrar solo las no leídas
  const notificacionesVisibles = notificacionesControlInterno
    .filter((n) => !n.leida)
    .slice(0, 3); // Mostrar máximo 3

  if (notificacionesVisibles.length === 0) {
    return null; // No mostrar el widget si no hay notificaciones
  }

  return (
    <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
            <Bell className="w-5 h-5" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Notificaciones y Alertas</h3>
            <p className="text-xs text-gray-500">{noLeidas} notificaciones</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Abrir panel global de notificaciones
            const event = new CustomEvent('abrir-notificaciones');
            window.dispatchEvent(event);
          }}
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Button>
      </div>

      {/* Lista de notificaciones */}
      <div className="space-y-3">
        {notificacionesVisibles.map((notif) => (
          <div
            key={notif.id}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              notif.tipo === 'critical'
                ? 'bg-red-50 border-red-200'
                : notif.tipo === 'warning'
                ? 'bg-orange-50 border-orange-200'
                : notif.tipo === 'info'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
            onClick={() => {
              if (notif.url) {
                window.location.href = notif.url;
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {notif.tipo === 'critical' || notif.tipo === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : notif.tipo === 'warning' ? (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4
                    className={`text-sm font-medium ${
                      notif.tipo === 'critical'
                        ? 'text-red-900'
                        : notif.tipo === 'warning'
                        ? 'text-orange-900'
                        : 'text-gray-900'
                    }`}
                  >
                    {notif.titulo}
                  </h4>
                  {notif.metadata?.criticidad && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        notif.metadata.criticidad === 'critica'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : notif.metadata.criticidad === 'alta'
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {notif.metadata.criticidad}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-700 line-clamp-2">{notif.descripcion}</p>

                {notif.url && (
                  <div className="mt-2">
                    <span className="text-xs font-medium inline-flex items-center gap-1"
                      style={{ color: '#003DA5' }}
                    >
                      Ver en Plan Anual
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ver todas */}
      {noLeidas > 3 && (
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              const event = new CustomEvent('abrir-notificaciones', {
                detail: { filtro: 'control-interno' },
              });
              window.dispatchEvent(event);
            }}
          >
            Ver todas las notificaciones ({noLeidas})
          </Button>
        </div>
      )}
    </div>
  );
}
