/**
 * ═════════════════════════════════════════════════════════════════════════
 * WIDGET DE VENCIMIENTOS - DASHBOARD OCI
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Lista de próximos vencimientos con semáforos
 * Ordenada por urgencia
 * 
 * @version 1.0
 */

import React from 'react';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { calcularDiasRestantes, getSemaforoPorDias } from '../utils/esapThemeOCI';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface Vencimiento {
  id: string;
  tipo: 'informe' | 'auditoria' | 'plan' | 'otro';
  titulo: string;
  descripcion: string;
  fechaVencimiento: string; // ISO date
  responsable?: string;
}

interface VencimientosWidgetProps {
  vencimientos: Vencimiento[];
  maxItems?: number;
  onVerTodos?: () => void;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════════

const TIPO_CONFIG = {
  informe: { label: 'Informe', icon: '📄', color: 'text-blue-600' },
  auditoria: { label: 'Auditoría', icon: '🔍', color: 'text-purple-600' },
  plan: { label: 'Plan', icon: '📋', color: 'text-orange-600' },
  otro: { label: 'Otro', icon: '📌', color: 'text-gray-600' },
};

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function VencimientosWidget({
  vencimientos,
  maxItems = 5,
  onVerTodos,
  className = '',
}: VencimientosWidgetProps) {
  
  // Ordenar por fecha de vencimiento
  const vencimientosOrdenados = [...vencimientos]
    .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())
    .slice(0, maxItems);

  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha);
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${meses[date.getMonth()]}`;
  };

  const getTextoVencimiento = (diasRestantes: number): string => {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} días`;
    if (diasRestantes === 0) return 'Vence hoy';
    if (diasRestantes === 1) return 'Vence mañana';
    return `Vence en ${diasRestantes} días`;
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E8F4F8] to-[#AED6F1] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#1B4F72]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Próximos Vencimientos
              </h3>
              <p className="text-sm text-gray-500">
                {vencimientos.length} {vencimientos.length === 1 ? 'pendiente' : 'pendientes'}
              </p>
            </div>
          </div>

          {onVerTodos && (
            <button
              onClick={onVerTodos}
              className="text-sm font-medium text-[#2874A6] hover:text-[#1B4F72] transition-colors"
            >
              Ver calendario →
            </button>
          )}
        </div>
      </div>

      {/* Lista de vencimientos */}
      <div className="divide-y divide-gray-100">
        {vencimientosOrdenados.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay vencimientos próximos</p>
          </div>
        ) : (
          vencimientosOrdenados.map((vencimiento) => {
            const diasRestantes = calcularDiasRestantes(vencimiento.fechaVencimiento);
            const colorSemaforo = getSemaforoPorDias(diasRestantes);
            const config = TIPO_CONFIG[vencimiento.tipo];

            return (
              <div
                key={vencimiento.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Semáforo */}
                  <div className="mt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        colorSemaforo === 'verde' ? 'bg-[#27AE60]' :
                        colorSemaforo === 'amarillo' ? 'bg-[#F39C12]' :
                        'bg-[#E74C3C]'
                      }`}
                      title={`Prioridad: ${colorSemaforo}`}
                    />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Tipo + Título */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium uppercase tracking-wide ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      {vencimiento.titulo}
                    </h4>

                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                      {vencimiento.descripcion}
                    </p>

                    {/* Footer: Fecha + Días restantes */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatearFecha(vencimiento.fechaVencimiento)}</span>
                      </div>

                      <div
                        className={`font-medium ${
                          diasRestantes <= 2 ? 'text-[#E74C3C]' :
                          diasRestantes <= 7 ? 'text-[#F39C12]' :
                          'text-[#27AE60]'
                        }`}
                      >
                        {getTextoVencimiento(diasRestantes)}
                      </div>
                    </div>
                  </div>

                  {/* Icono de alerta si es crítico */}
                  {diasRestantes <= 2 && (
                    <AlertCircle className="w-5 h-5 text-[#E74C3C] flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {vencimientos.length > maxItems && (
        <div className="p-4 bg-gray-50 text-center border-t border-gray-200">
          <button
            onClick={onVerTodos}
            className="text-sm font-medium text-[#2874A6] hover:text-[#1B4F72] transition-colors"
          >
            Ver todos los vencimientos ({vencimientos.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default VencimientosWidget;
