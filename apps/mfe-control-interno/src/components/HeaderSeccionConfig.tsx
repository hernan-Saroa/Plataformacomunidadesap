/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HEADER DE SECCIÓN CONFIGURACIÓN - COMPONENTE UNIFICADO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Header compacto y elegante para todas las pestañas de Configuraciones.
 * Diseño unificado world-class: ícono + título + subtítulo + acciones.
 * Altura fija reducida para maximizar espacio de contenido.
 */

import type { ReactNode } from 'react';

interface HeaderSeccionConfigProps {
  /** Ícono Lucide como ReactNode */
  icon: ReactNode;
  /** Título principal de la sección */
  titulo: string;
  /** Subtítulo descriptivo */
  subtitulo: string;
  /** Contenido a la derecha (botones, badges, etc.) */
  children?: ReactNode;
}

export function HeaderSeccionConfig({ icon, titulo, subtitulo, children }: HeaderSeccionConfigProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {/* Ícono compacto — color sólido corporativo ESAP */}
        <div className="w-9 h-9 bg-[#003DA5] rounded-lg flex items-center justify-center flex-shrink-0">
          <div className="w-[18px] h-[18px] text-white [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </div>
        {/* Título + subtítulo compactos */}
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">
            {titulo}
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-500 leading-tight truncate mt-0.5">
            {subtitulo}
          </p>
        </div>
      </div>
      {/* Acciones a la derecha */}
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
