/**
 * ════════════════════════════════════════════════════════════════════════════
 * NOTIFICACIONES DROPDOWN - PORTAL TRANSACCIONAL
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Dropdown de notificaciones recientes para el navbar del portal.
 * Se activa desde el icono de campana (Bell).
 * 
 * CARACTERÍSTICAS:
 * - Vista compacta de últimas notificaciones
 * - Estados: Nueva, Leída
 * - Tipos: Info, Éxito, Advertencia, Error
 * - Link para ver todas las notificaciones
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

interface Notificacion {
  id: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  titulo: string;
  descripcion?: string;
  fecha: string;
  leida: boolean;
}

// Mock data - Notificaciones de ejemplo
const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: '1',
    tipo: 'info',
    titulo: 'Nueva notificación disponible',
    descripcion: 'Tienes una actualización en tu perfil',
    fecha: 'Hace 2 horas',
    leida: false,
  },
  {
    id: '2',
    tipo: 'success',
    titulo: 'Proceso completado exitosamente',
    descripcion: 'Tu solicitud ha sido aprobada',
    fecha: 'Hace 1 día',
    leida: false,
  },
  {
    id: '3',
    tipo: 'warning',
    titulo: 'Documento pendiente de firma',
    descripcion: 'Requiere tu atención',
    fecha: 'Hace 2 días',
    leida: true,
  },
  {
    id: '4',
    tipo: 'info',
    titulo: 'Recordatorio de reunión',
    descripcion: 'Mañana a las 10:00 AM',
    fecha: 'Hace 3 días',
    leida: true,
  },
];

export function NotificacionesDropdown() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_MOCK);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev =>
      prev.map(n => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones(prev =>
      prev.map(n => ({ ...n, leida: true }))
    );
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const getIconoTipo = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColorTipo = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'success':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'warning':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'error':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      default:
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#1e5da8]" />
            <h3 className="font-black text-gray-900">Notificaciones</h3>
          </div>
          {noLeidas > 0 && (
            <Badge className="bg-red-500 text-white">
              {noLeidas} nuevas
            </Badge>
          )}
        </div>

        {noLeidas > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={marcarTodasComoLeidas}
            className="w-full justify-start text-xs text-[#1e5da8] hover:bg-blue-50 h-8"
          >
            <Check className="w-3 h-3 mr-1" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Lista de Notificaciones */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {notificaciones.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No tienes notificaciones</p>
            </div>
          ) : (
            notificaciones.map((notificacion) => (
              <motion.div
                key={notificacion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`relative p-3 rounded-lg border transition-all duration-200 ${
                  notificacion.leida
                    ? 'bg-white border-gray-200 hover:bg-gray-50'
                    : getColorTipo(notificacion.tipo)
                } ${!notificacion.leida ? 'shadow-sm' : ''}`}
              >
                {/* Indicador de no leída */}
                {!notificacion.leida && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Icono */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getIconoTipo(notificacion.tipo)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notificacion.leida ? 'font-bold' : 'font-semibold'} text-gray-900 mb-1`}>
                      {notificacion.titulo}
                    </p>
                    {notificacion.descripcion && (
                      <p className="text-xs text-gray-600 mb-2">
                        {notificacion.descripcion}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{notificacion.fecha}</p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notificacion.leida && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => marcarComoLeida(notificacion.id)}
                        title="Marcar como leída"
                      >
                        <Check className="w-3 h-3 text-gray-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => eliminarNotificacion(notificacion.id)}
                      title="Eliminar"
                    >
                      <X className="w-3 h-3 text-gray-600" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer - Ver todas */}
      {notificaciones.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              className="w-full justify-between text-sm text-[#1e5da8] hover:bg-blue-50 font-semibold"
            >
              Ver todas las notificaciones
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
