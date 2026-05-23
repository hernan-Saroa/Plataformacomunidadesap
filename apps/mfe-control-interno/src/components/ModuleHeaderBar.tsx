/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CABECERA UNIFICADA DE MÓDULO — WORLD CLASS DESIGN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente reutilizable para la cabecera de cada submódulo dentro de
 * Control Interno de Gestión. Diseño limpio: fondo blanco, ícono sólido,
 * borde inferior de color del módulo.
 * 
 * Uso:
 *   <ModuleHeaderBar
 *     title="Auditorías OCI"
 *     subtitle="0 auditorías · Sistema de Gestión"
 *     icon={<ClipboardCheck className="w-5 h-5 text-white" />}
 *     color="#F97316"
 *     rightContent={<TooltipGuia ... />}
 *   />
 */

import type { ReactNode } from 'react';
import { PlanAnualVigenciaHeaderControl } from './PlanAnualVigenciaContext';

interface ModuleHeaderBarProps {
  /** Título principal del módulo */
  title: string;
  /** Subtítulo descriptivo */
  subtitle?: string;
  /** Ícono Lucide (debe tener text-white) */
  icon: ReactNode;
  /** Color sólido del ícono y borde inferior (hex) */
  color: string;
  /** Contenido derecho (tooltip, badge, botones) */
  rightContent?: ReactNode;
  /** Selector de vigencia del plan anual con etiqueta (por defecto: true) */
  showVigenciaSelector?: boolean;
}

export function ModuleHeaderBar({
  title,
  subtitle,
  icon,
  color,
  rightContent,
  showVigenciaSelector = true,
}: ModuleHeaderBarProps) {
  const mostrarVigencia = showVigenciaSelector !== false;
  const tieneDerecha = mostrarVigencia || rightContent;
  return (
    <div
      className="rounded-xl border border-gray-200 overflow-hidden mb-3"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: '#FFFFFF',
          borderBottom: `3px solid ${color}`
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color }}
          >
            {icon}
          </div>
          <div>
            <h2
              className="text-base sm:text-lg font-black leading-tight"
              style={{ color }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {tieneDerecha && (
          <div className="flex flex-row flex-wrap items-center justify-end gap-2 sm:gap-3 ml-2">
            {mostrarVigencia && <PlanAnualVigenciaHeaderControl />}
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}
