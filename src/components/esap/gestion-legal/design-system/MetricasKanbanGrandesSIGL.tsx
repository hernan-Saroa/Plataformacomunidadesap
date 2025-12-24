/**
 * MetricasKanbanGrandesSIGL - Métricas EXACTAMENTE como en las imágenes
 * Números más grandes, mejor espaciado
 */

import { LucideIcon } from 'lucide-react';
import { SIGL_COLORS } from './tokens';

interface MetricaProps {
  valor: number;
  label: string;
  icono: LucideIcon;
  color: string;
}

interface MetricasKanbanGrandesSIGLProps {
  metricas: MetricaProps[];
}

export function MetricasKanbanGrandesSIGL({ metricas }: MetricasKanbanGrandesSIGLProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-5 bg-gray-50">
      {metricas.map((metrica, index) => {
        const Icon = metrica.icono;
        return (
          <div
            key={index}
            className="bg-white rounded-lg p-5 border hover:shadow-lg transition-all cursor-pointer"
            style={{ borderColor: SIGL_COLORS.border }}
          >
            <div className="flex items-center justify-between">
              {/* Número y label */}
              <div>
                <p 
                  className="text-4xl font-bold mb-1" 
                  style={{ color: metrica.color }}
                >
                  {metrica.valor}
                </p>
                <p 
                  className="text-sm font-medium" 
                  style={{ color: SIGL_COLORS.textSecondary }}
                >
                  {metrica.label}
                </p>
              </div>

              {/* Ícono circular */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${metrica.color}15` }}
              >
                <Icon size={28} style={{ color: metrica.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
