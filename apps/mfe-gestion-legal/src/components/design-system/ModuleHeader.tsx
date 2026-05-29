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

  // Contenido personalizado (para casos especiales en fila 2)
  customActions?: ReactNode;

  // Contenido personalizado para fila 1 (junto a los botones)
  topCustomActions?: ReactNode;
}

export function ModuleHeader({
  title,
  subtitle,
  toggleView,
  buttons = [],
  infoTooltip,
  customActions,
  topCustomActions
}: ModuleHeaderProps) {
  
  // ✅ Hook responsive reactivo
  const { isMobile, isTablet, isDesktop, isLarge } = useResponsive();

  return (
    <div className="space-y-3" data-tour="module-header">
      {/* Fila 1: Título + Info Tooltip + Botones principales (mobile-first) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Título y subtítulo con barra de acento ESAP */}
        <div className="flex-1 min-w-0 border-l-4 border-[#003DA5] pl-3 sm:pl-4">
          <h2
            className="font-black leading-tight tracking-tight"
            style={{
              color: '#003DA5',
              fontSize: isMobile ? '1.15rem' : isTablet ? '1.25rem' : isDesktop ? '1.35rem' : '1.5rem'
            }}
            title={title}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Acciones principales: Info + Botones */}
        <div className="flex items-center flex-wrap justify-start sm:justify-end gap-2 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
          {topCustomActions && (
            <div className="flex items-center">
              {topCustomActions}
            </div>
          )}
          {infoTooltip}
          
          {buttons.map((button, idx) => {
            const defaultClassName = button.variant === 'primary' || !button.variant
              ? 'bg-gradient-to-r from-[#003DA5] to-[#2563EB] hover:from-[#002e7d] hover:to-[#1e5da8] text-white font-extrabold shadow-sm hover:shadow active:scale-95 rounded-lg border-0'
              : button.variant === 'secondary'
              ? 'bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm hover:-translate-y-0.5 active:scale-95 rounded-lg border-0'
              : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-[#003DA5] font-extrabold shadow-sm hover:shadow active:scale-95 rounded-lg';

            return (
              <button
                key={idx}
                onClick={button.onClick}
                className={`px-2.5 sm:px-3 py-1.5 flex items-center gap-1 sm:gap-1.5 text-xs font-bold transition-all duration-200 ${
                  button.className || defaultClassName
                }`}
                style={{
                  minHeight: isMobile ? '34px' : '36px'
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
        <div className="flex flex-row items-center justify-between gap-3 w-full pt-1 border-t border-slate-100 flex-nowrap overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          
          {/* Lado izquierdo: Segmented Tab Control */}
          <div className="flex-shrink-0">
            {toggleView && (
              <div className="flex items-center gap-1 p-0.5 rounded-lg w-full sm:w-auto sm:inline-flex border border-slate-250 shadow-inner bg-slate-50">
                {toggleView.options.map((option, idx) => {
                  const isCurrent = toggleView.current === (option.value || option.label.toLowerCase());
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleView.onChange(option.value || option.label.toLowerCase())}
                      className={`flex-1 sm:flex-none px-2 sm:px-3.5 py-1.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-200 active:scale-95 ${
                        isCurrent
                          ? 'bg-white shadow-sm border border-slate-200/50 text-[#003DA5] font-extrabold' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                      }`}
                      style={{ 
                        minHeight: isMobile ? '34px' : '36px'
                      }}
                    >
                      <span className="text-sm sm:text-base">{option.icon}</span>
                      <span className="text-[11px] sm:text-xs">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lado derecho: customActions (Tableros, selectores, filtros) */}
          {customActions && (
            <div className="flex-shrink-0 min-w-0 flex justify-start sm:justify-end">
              {customActions}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
