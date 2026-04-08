/**
 * ═════════════════════════════════════════════════════════════════════════
 * TIMELINE DE ACTIVIDADES - OCIG
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Línea de tiempo con actividades de auditoría
 * Muestra historial cronológico de eventos
 * 
 * @version 1.0
 */

import React from 'react';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Clock,
  User
} from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface ActividadTimeline {
  id: string;
  tipo: 'creacion' | 'edicion' | 'comentario' | 'cambio_estado' | 'adjunto' | 'asignacion' | 'completado' | 'alerta';
  titulo: string;
  descripcion?: string;
  usuario: string;
  fecha: string; // ISO date
  icono?: 'documento' | 'equipo' | 'check' | 'alerta' | 'calendario' | 'usuario';
  color?: string;
}

interface TimelineActividadesProps {
  actividades: ActividadTimeline[];
  maxItems?: number;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════════

const TIPO_CONFIG = {
  creacion: { color: '#2874A6', bg: '#E8F4F8', Icon: FileText },
  edicion: { color: '#F39C12', bg: '#FEF9E7', Icon: FileText },
  comentario: { color: '#8B5CF6', bg: '#EDE9FE', Icon: FileText },
  cambio_estado: { color: '#3B82F6', bg: '#DBEAFE', Icon: CheckCircle },
  adjunto: { color: '#10B981', bg: '#D1FAE5', Icon: FileText },
  asignacion: { color: '#EC4899', bg: '#FCE7F3', Icon: Users },
  completado: { color: '#27AE60', bg: '#D4EFDF', Icon: CheckCircle },
  alerta: { color: '#E74C3C', bg: '#FADBD8', Icon: AlertCircle },
};

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function TimelineActividades({
  actividades,
  maxItems,
  className = '',
}: TimelineActividadesProps) {
  
  const actividadesVisibles = maxItems 
    ? actividades.slice(0, maxItems)
    : actividades;

  const formatearFecha = (fecha: string): { fecha: string; hora: string } => {
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    const fechaFormateada = date.toLocaleDateString('es-CO', opciones);
    const hora = date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return { fecha: fechaFormateada, hora };
  };

  return (
    <div className={`relative ${className}`}>
      {actividadesVisibles.map((actividad, index) => {
        const config = TIPO_CONFIG[actividad.tipo];
        const Icon = config.Icon;
        const { fecha, hora } = formatearFecha(actividad.fecha);
        const isLast = index === actividadesVisibles.length - 1;

        return (
          <div key={actividad.id} className="relative pb-8">
            {/* Línea vertical conectora */}
            {!isLast && (
              <div 
                className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"
                style={{ marginLeft: '0px' }}
              />
            )}

            <div className="flex items-start gap-4">
              {/* Icono */}
              <div 
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10"
                style={{ backgroundColor: config.bg }}
              >
                <Icon 
                  className="w-5 h-5" 
                  style={{ color: config.color }}
                />
              </div>

              {/* Contenido */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      {actividad.titulo}
                    </h4>
                    {actividad.descripcion && (
                      <p className="text-sm text-gray-600">
                        {actividad.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: Usuario y Fecha */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    <span className="font-medium">{actividad.usuario}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{fecha}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{hora}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Mostrar más */}
      {maxItems && actividades.length > maxItems && (
        <div className="text-center pt-4">
          <button className="text-sm font-medium text-[#2874A6] hover:text-[#1B4F72] transition-colors">
            Ver {actividades.length - maxItems} actividades más →
          </button>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default TimelineActividades;
