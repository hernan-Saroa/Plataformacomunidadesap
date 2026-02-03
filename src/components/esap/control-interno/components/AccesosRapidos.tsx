/**
 * ═════════════════════════════════════════════════════════════════════════
 * ACCESOS RÁPIDOS - DASHBOARD OCIG
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Botones de acceso rápido a acciones frecuentes
 * 
 * @version 1.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface AccesoRapido {
  id: string;
  label: string;
  descripcion?: string;
  icon: LucideIcon;
  color?: string;
  onClick: () => void;
}

interface AccesosRapidosProps {
  accesos: AccesoRapido[];
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function AccesosRapidos({
  accesos,
  className = '',
}: AccesosRapidosProps) {
  
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Accesos Rápidos
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accesos.map((acceso) => {
          const Icon = acceso.icon;
          const color = acceso.color || '#2874A6';

          return (
            <button
              key={acceso.id}
              onClick={acceso.onClick}
              className="group relative bg-white rounded-lg border-2 border-gray-200 p-4 text-left hover:border-[#2874A6] hover:shadow-md transition-all"
            >
              {/* Icono */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all group-hover:scale-110"
                style={{
                  backgroundColor: `${color}15`,
                }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{ color }}
                />
              </div>

              {/* Texto */}
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {acceso.label}
              </h4>

              {acceso.descripcion && (
                <p className="text-xs text-gray-500">
                  {acceso.descripcion}
                </p>
              )}

              {/* Flecha decorativa */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-5 h-5 text-[#2874A6]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default AccesosRapidos;
