import React, { ReactNode } from 'react';

interface Boton {
  label: string;
  labelMobile?: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  buttons?: Boton[];
  customActions?: ReactNode;
  /** Píldora junto al título, p. ej. la etapa del proceso. */
  etiqueta?: string;
}

/**
 * Cabecera de módulo con el mismo lenguaje visual que Gestión Legal y
 * Control Interno: tarjeta blanca, borde inferior de color institucional,
 * ícono sobre fondo sólido y título en el color del módulo.
 */
export function ModuleHeader({
  title,
  subtitle,
  icon,
  color = '#003DA5',
  buttons = [],
  customActions,
  etiqueta,
}: Props) {
  return (
    <div className="space-y-3">
      {/* sticky: con listas largas la cabecera se perdía al scrollear y el
          usuario dejaba de ver en qué etapa está parado. */}
      <div
        className="sticky top-0 z-20 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        style={{ borderBottom: `3px solid ${color}` }}
      >
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: color }}
            >
              {/* Blanco explícito: sin él, el icono hereda el negro del texto
                  y sobre el fondo sólido de color no se distingue nada. */}
              <span className="flex text-white">{icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="font-black leading-tight tracking-tight text-[15px] m-0"
                  style={{ color }}
                  title={title}
                >
                  {title}
                </h2>
                {etiqueta && (
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ color, background: `${color}15` }}
                  >
                    {etiqueta}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed m-0">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {customActions}
            {buttons.map((boton, idx) => (
              <button
                key={idx}
                onClick={boton.onClick}
                disabled={boton.disabled}
                className={`px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold rounded-lg
                  transition-all duration-200 min-h-[36px] disabled:opacity-50
                  ${
                    boton.variant === 'outline'
                      ? 'bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#003DA5] text-slate-700 hover:text-[#003DA5] shadow-sm'
                      : 'bg-[#003DA5] hover:bg-[#002e7d] text-white shadow-sm active:scale-95 border-0'
                  }`}
              >
                {boton.icon}
                <span className="hidden sm:inline">{boton.label}</span>
                <span className="sm:hidden">{boton.labelMobile ?? boton.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
