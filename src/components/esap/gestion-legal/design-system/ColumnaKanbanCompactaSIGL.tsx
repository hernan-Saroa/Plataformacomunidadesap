/**
 * ColumnaKanbanCompactaSIGL - Columna EXACTAMENTE como en las imágenes
 * Header más pequeño y compacto
 */

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { SIGL_COLORS } from './tokens';

interface ColumnaKanbanCompactaSIGLProps {
  titulo: string;
  cantidad: number;
  color: string;
  children: React.ReactNode;
}

export function ColumnaKanbanCompactaSIGL({
  titulo,
  cantidad,
  color,
  children,
}: ColumnaKanbanCompactaSIGLProps) {
  const [colapsada, setColapsada] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header compacto */}
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between cursor-pointer border-t-3"
        style={{
          backgroundColor: `${color}08`,
          borderTopColor: color,
          borderTopWidth: '3px',
        }}
        onClick={() => setColapsada(!colapsada)}
      >
        <div className="flex items-center gap-2">
          <h3 
            className="text-sm font-semibold" 
            style={{ color: SIGL_COLORS.textPrimary }}
          >
            {titulo}
          </h3>
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {cantidad}
          </span>
        </div>
        <button className="hover:opacity-70">
          {colapsada ? (
            <ChevronDown size={16} style={{ color: SIGL_COLORS.textSecondary }} />
          ) : (
            <ChevronUp size={16} style={{ color: SIGL_COLORS.textSecondary }} />
          )}
        </button>
      </div>

      {/* Contenido */}
      {!colapsada && (
        <div 
          className="flex-1 overflow-y-auto p-3" 
          style={{ backgroundColor: '#F8F9FA' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
