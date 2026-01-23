import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ServiceCardProps {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  badge?: number | string;
  color?: string;
  onClick: () => void;
}

/**
 * Card de Servicio para el Portal Transaccional
 * 
 * Muestra un servicio disponible con badge opcional de tareas pendientes.
 */
export function ServiceCard({
  titulo,
  descripcion,
  icono,
  badge,
  color = '#003DA5',
  onClick
}: ServiceCardProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-[#2962FF]/30 transition-all cursor-pointer overflow-hidden"
    >
      {/* Barra de color superior */}
      <div 
        className="h-1 w-full"
        style={{ backgroundColor: color }}
      />

      <div className="p-6">
        {/* Header con Icono y Badge */}
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${color}15` }}
          >
            <div style={{ color }}>
              {icono}
            </div>
          </div>

          {badge !== undefined && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-[#F57C00] text-white shadow-sm">
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* Título */}
        <h3 className="text-lg font-medium text-[#003DA5] mb-2 group-hover:text-[#2962FF] transition-colors">
          {titulo}
        </h3>

        {/* Descripción */}
        <p className="text-sm text-gray-600 mb-4">
          {descripcion}
        </p>

        {/* Acción */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#2962FF] group-hover:underline">
            Acceder
          </span>
          <ChevronRight className="w-5 h-5 text-[#2962FF] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
