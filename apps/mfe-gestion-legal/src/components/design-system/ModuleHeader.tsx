/**
 * ModuleHeader - Header estandarizado para todos los módulos de Gestión Legal
 * Garantiza coherencia visual 100% + RESPONSIVE MOBILE-FIRST
 */

import { ReactNode } from 'react';
import { Columns3, List } from 'lucide-react';
import { useResponsive } from '@esap-mfe/shared-hooks/useResponsive';

interface ModuleHeaderButton {
  label: string;
  labelMobile?: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
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
  
  // ✅ Hook responsive reactivo
  const { isMobile, isTablet, isDesktop, isLarge } = useResponsive();

  return (
    <div className="space-y-3 sm:space-y-4" data-tour="module-header">
      {/* Fila 1: Título + Info Tooltip + Botones principales (mobile-first) */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        {/* Título y subtítulo */}
        <div className="flex-1 min-w-0">
          <h2
            className="font-black leading-tight truncate"
            style={{
              color: '#003DA5',
              fontSize: isMobile ? '1.25rem' : isTablet ? '1.375rem' : isDesktop ? '1.5rem' : '1.75rem'
            }}
            title={title}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2 sm:line-clamp-2" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Acciones principales: Info + Botones */}
        <div className="flex items-center flex-wrap justify-end gap-2 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
          {infoTooltip}
          
          {buttons.map((button, idx) => {
            const defaultClassName = button.variant === 'primary' || !button.variant
              ? 'bg-[#2962FF] hover:bg-[#1e5da8] text-white font-bold shadow-sm hover:shadow-md active:scale-95'
              : button.variant === 'secondary'
              ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm active:scale-95'
              : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 text-blue-700 font-semibold active:scale-95';

            return (
              <button
                key={idx}
                onClick={button.onClick}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-sm transition-all ${
                  button.className || defaultClassName
                }`}
                style={{
                  minHeight: isMobile ? '40px' : '44px' // Táctil en mobile
                }}
              >
                {button.icon}
                <span className="hidden sm:inline">
                  {button.label}
                </span>
                <span className="sm:hidden">
                  {button.labelMobile || button.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fila 2: Toggle de Vista y Acciones Personalizadas (Filtros, Tableros) */}
      {(toggleView || customActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          
          {/* Lado izquierdo: ToggleView */}
          <div className="w-full sm:w-auto">
            {toggleView && (
              <div className="flex items-center gap-1 p-1 rounded-lg w-full sm:w-auto sm:inline-flex" style={{ background: '#F3F4F6' }}>
                {toggleView.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleView.onChange(option.value || option.label.toLowerCase())}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
                      toggleView.current === (option.value || option.label.toLowerCase())
                        ? 'bg-white shadow-sm' 
                        : 'hover:bg-gray-200 active:bg-gray-300'
                    }`}
                    style={{ 
                      color: toggleView.current === (option.value || option.label.toLowerCase()) ? '#003DA5' : '#6B7280',
                      minHeight: isMobile ? '40px' : '44px'
                    }}
                  >
                    <span className="text-base sm:text-lg">{option.icon}</span>
                    <span className="text-xs sm:text-sm md:text-base">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lado derecho: customActions (Ej: selectores, filtros) */}
          {customActions && (
            <div className="w-full sm:w-auto flex justify-start sm:justify-end">
              {customActions}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
