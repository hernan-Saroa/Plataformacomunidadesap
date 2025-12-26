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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" data-tour="module-header">
      {/* Título y subtítulo */}
      <div className="flex-1">
        <h2 
          className="font-black leading-tight"
          style={{ 
            color: '#003DA5',
            fontSize: isMobile ? '1.25rem' : isTablet ? '1.375rem' : '1.5rem'
          }}
        >
          {title}
        </h2>
        {!isMobile && subtitle && (
          <p className="text-sm text-gray-600 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* Toggle de Vista */}
        {toggleView && !isMobile && (
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
            {toggleView.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => toggleView.onChange(option.value || option.label.toLowerCase())}
                className={`${isTablet ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  toggleView.current === (option.value || option.label.toLowerCase())
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-gray-200'
                }`}
                style={{ 
                  color: toggleView.current === (option.value || option.label.toLowerCase()) ? '#003DA5' : '#6B7280'
                }}
              >
                {option.icon}
                {!isTablet && option.label}
              </button>
            ))}
          </div>
        )}

        {/* Info Tooltip */}
        {infoTooltip}

        {/* Contenido personalizado */}
        {customActions}

        {/* Botones de acción */}
        {buttons.map((button, idx) => {
          const defaultClassName = button.variant === 'primary' || !button.variant
            ? 'bg-orange-600 hover:bg-orange-700 text-white font-bold'
            : button.variant === 'secondary'
            ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
            : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 text-blue-700 font-semibold';

          return (
            <button
              key={idx}
              onClick={button.onClick}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
                button.className || defaultClassName
              }`}
            >
              {button.icon}
              {isMobile && button.labelMobile 
                ? button.labelMobile 
                : !isMobile ? button.label : null
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}