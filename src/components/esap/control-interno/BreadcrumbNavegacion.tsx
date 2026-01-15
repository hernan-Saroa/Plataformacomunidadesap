/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BREADCRUMB DE NAVEGACIÓN - PORTAL TRANSACCIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Breadcrumb profesional con:
 * - Navegación contextual
 * - Indicador visual de ubicación
 * - Click para navegar rápidamente
 * - Responsive mobile-first
 * 
 * FECHA: 4 Enero 2026
 */

import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbNavegacionProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNavegacion({ items, className = '' }: BreadcrumbNavegacionProps) {
  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      <motion.button
        onClick={items[0]?.onClick}
        className="flex items-center gap-1.5 text-gray-600 hover:text-[#2962FF] transition-colors group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Home className="w-4 h-4 group-hover:text-[#2962FF]" />
        <span className="hidden sm:inline font-medium">Inicio</span>
      </motion.button>

      {items.slice(1).map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.onClick ? (
            <motion.button
              onClick={item.onClick}
              className={`font-medium transition-colors ${
                item.active 
                  ? 'text-[#2962FF]' 
                  : 'text-gray-600 hover:text-[#2962FF]'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {item.label}
            </motion.button>
          ) : (
            <span className={`font-medium ${item.active ? 'text-[#2962FF]' : 'text-gray-600'}`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

/**
 * Botón de "Volver" prominente para mejorar navegación
 */
interface BotonVolverProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function BotonVolver({ onClick, label = 'Volver', className = '' }: BotonVolverProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-[#2962FF] hover:text-[#2962FF] font-semibold transition-all shadow-sm hover:shadow-md group ${className}`}
      whileHover={{ scale: 1.02, x: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <svg 
        className="w-5 h-5 group-hover:-translate-x-1 transition-transform" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      {label}
    </motion.button>
  );
}

/**
 * Sticky Navigation Bar para vistas internas
 */
interface StickyNavBarProps {
  titulo: string;
  onVolver: () => void;
  icono?: React.ComponentType<{ className?: string }>;
  acciones?: React.ReactNode;
}

export function StickyNavBar({ titulo, onVolver, icono: Icono, acciones }: StickyNavBarProps) {
  return (
    <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <BotonVolver onClick={onVolver} className="flex-shrink-0" />
          
          <div className="h-8 w-px bg-gray-300 flex-shrink-0" />
          
          <div className="flex items-center gap-3 min-w-0">
            {Icono && (
              <div className="w-10 h-10 bg-gradient-to-br from-[#2962FF] to-[#1E88E5] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Icono className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{titulo}</h1>
              <p className="text-xs text-gray-500">Navegación rápida</p>
            </div>
          </div>
        </div>

        {acciones && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {acciones}
          </div>
        )}
      </div>
    </div>
  );
}
