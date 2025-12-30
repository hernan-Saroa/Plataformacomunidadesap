/**
 * ModuleHeader - Header estandarizado para todos los módulos de Gestión Legal
 * Garantiza coherencia visual 100%
 */

import { ReactNode } from 'react';
import { Columns3, List } from 'lucide-react';

interface ModuleHeaderButton {
  label: string;
  labelMobile?: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

interface ModuleHeaderToggleOption {
  label: string;
  icon: ReactNode;
  value?: string;
}

interface ModuleHeaderProps {
  // Títulos
  title: string;
  subtitle?: string;
  
  // Toggle de vista (Kanban/Lista/Tabla/etc)
  toggleView?: {
    current: string;
    onChange: (view: string) => void;
    options: ModuleHeaderToggleOption[];
  };
  
  // Botones de acción
  buttons?: ModuleHeaderButton[];
  
  // Info Tooltip (componente ModuleInfoTooltip)
  infoTooltip?: ReactNode;
  
  // Contenido personalizado (para casos especiales)
  customActions?: ReactNode;
}

export function ModuleHeader({
  title,
  subtitle,
  toggleView,
  buttons = [],
  infoTooltip,
  customActions
}: ModuleHeaderProps) {
  
  // Detectar responsive (podría recibirse como prop si ya se calcula en el componente padre)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;

  return (
    <div className="space-y-3" data-tour="module-header">
      {/* Fila 1: Título + Info Tooltip + Botones principales (mobile-first) */}
      <div className="flex items-start justify-between gap-3">
        {/* Título y subtítulo */}
        <div className="flex-1 min-w-0">
          <h2 
            className="font-black leading-tight truncate"
            style={{ 
              color: '#003DA5',
              fontSize: isMobile ? '1.125rem' : isTablet ? '1.375rem' : '1.5rem'
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-1 sm:line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Acciones principales: Info + Botones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Info Tooltip */}
          {infoTooltip}

          {/* Botones de acción */}
          {buttons.map((button, idx) => {
            const defaultClassName = button.variant === 'primary' || !button.variant
              ? 'bg-[#2962FF] hover:bg-[#1e5da8] text-white font-bold shadow-sm'
              : button.variant === 'secondary'
              ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
              : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 text-blue-700 font-semibold';

            return (
              <button
                key={idx}
                onClick={button.onClick}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition-all ${
                  button.className || defaultClassName
                }`}
              >
                {button.icon}
                <span className="hidden sm:inline">
                  {button.labelMobile && isMobile ? button.labelMobile : button.label}
                </span>
                <span className="sm:hidden">
                  {button.labelMobile || button.label}
                </span>
              </button>
            );
          })}

          {/* Contenido personalizado */}
          {customActions}
        </div>
      </div>

      {/* Fila 2: Toggle de Vista (siempre visible, responsive) */}
      {toggleView && (
        <div className="flex items-center gap-1 p-1 rounded-lg w-full sm:w-auto overflow-x-auto" style={{ background: '#F3F4F6' }}>
          {toggleView.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => toggleView.onChange(option.value || option.label.toLowerCase())}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap ${
                toggleView.current === (option.value || option.label.toLowerCase())
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-200'
              }`}
              style={{ 
                color: toggleView.current === (option.value || option.label.toLowerCase()) ? '#003DA5' : '#6B7280'
              }}
            >
              <span className="text-sm sm:text-base">{option.icon}</span>
              <span className="hidden xs:inline text-[10px] sm:text-xs md:text-sm">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}