/**
 * HeaderKanbanLimpioSIGL - Header EXACTAMENTE como en las imágenes
 * Layout más limpio y profesional
 */

import { LayoutGrid, List, Minimize2, Plus, Download } from 'lucide-react';
import { SIGL_COLORS } from './tokens';

interface HeaderKanbanLimpioSIGLProps {
  titulo: string;
  subtitulo: string;
  vistaActual: 'kanban' | 'lista';
  onCambiarVista: (vista: 'kanban' | 'lista') => void;
  onNuevo: () => void;
  textoBotonNuevo: string;
  onExportar?: () => void;
  filtroTerritorial?: React.ReactNode;
}

export function HeaderKanbanLimpioSIGL({
  titulo,
  subtitulo,
  vistaActual,
  onCambiarVista,
  onNuevo,
  textoBotonNuevo,
  onExportar,
  filtroTerritorial,
}: HeaderKanbanLimpioSIGLProps) {
  return (
    <div className="bg-white border-b" style={{ borderColor: SIGL_COLORS.border }}>
      {/* Fila principal: Título + Botones */}
      <div className="px-6 py-5 flex items-center justify-between">
        {/* Título y subtítulo */}
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: SIGL_COLORS.textPrimary }}>
            {titulo}
          </h1>
          <p className="text-sm" style={{ color: SIGL_COLORS.textSecondary }}>
            {subtitulo}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          {/* Toggle Kanban/Lista */}
          <div className="flex items-center rounded-lg overflow-hidden border" style={{ borderColor: SIGL_COLORS.border }}>
            <button
              onClick={() => onCambiarVista('kanban')}
              className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                backgroundColor: vistaActual === 'kanban' ? SIGL_COLORS.primary : 'white',
                color: vistaActual === 'kanban' ? 'white' : SIGL_COLORS.textSecondary,
              }}
            >
              <LayoutGrid size={16} />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => onCambiarVista('lista')}
              className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all border-l"
              style={{
                backgroundColor: vistaActual === 'lista' ? SIGL_COLORS.primary : 'white',
                color: vistaActual === 'lista' ? 'white' : SIGL_COLORS.textSecondary,
                borderLeftColor: SIGL_COLORS.border,
              }}
            >
              <List size={16} />
              <span>Lista</span>
            </button>
          </div>

          {/* Botón Colapsar */}
          <button
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 border rounded-lg hover:bg-gray-50 transition-colors"
            style={{ 
              borderColor: SIGL_COLORS.border, 
              color: SIGL_COLORS.textSecondary 
            }}
          >
            <Minimize2 size={16} />
            <span>Colapsar</span>
          </button>

          {/* Botón Nuevo (Naranja) */}
          <button
            onClick={onNuevo}
            className="px-4 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg hover:opacity-90 transition-opacity text-white"
            style={{ backgroundColor: '#FF6B35' }}
          >
            <Plus size={16} />
            <span>{textoBotonNuevo}</span>
          </button>
        </div>
      </div>

      {/* Fila de filtros */}
      {(filtroTerritorial || onExportar) && (
        <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: SIGL_COLORS.border }}>
          <div className="flex-1">
            {filtroTerritorial}
          </div>
          {onExportar && (
            <button
              onClick={onExportar}
              className="px-4 py-2 text-sm font-medium flex items-center gap-2 border rounded-lg hover:bg-gray-50 transition-colors"
              style={{ 
                borderColor: SIGL_COLORS.border, 
                color: SIGL_COLORS.textSecondary 
              }}
            >
              <Download size={14} />
              <span>Exportar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
