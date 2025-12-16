/**
 * BARRA DE HERRAMIENTAS UNIFICADA
 * Componente compartido para acciones y controles
 * Usado en: Control Interno, Control Disciplinario, Gestión Legal
 */

import { Search, Filter, Download, Plus, LayoutGrid, List as ListIcon, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '../../ui/button';

type ViewType = 'kanban' | 'lista' | 'calendario' | 'gantt';

interface ToolbarActionsProps {
  // Búsqueda
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  
  // Vistas
  views?: ViewType[];
  activeView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  
  // Acciones
  onFilter?: () => void;
  onExport?: () => void;
  onAdd?: () => void;
  addButtonText?: string;
  
  // Colores
  primaryColor?: string;
  
  // Extras
  extraActions?: React.ReactNode;
}

export function ToolbarActions({
  searchPlaceholder = 'Buscar...',
  searchValue = '',
  onSearchChange,
  views = ['kanban', 'lista'],
  activeView = 'kanban',
  onViewChange,
  onFilter,
  onExport,
  onAdd,
  addButtonText = 'Nuevo',
  primaryColor = '#F97316',
  extraActions
}: ToolbarActionsProps) {
  const viewIcons = {
    kanban: <LayoutGrid className="w-4 h-4 mr-1" />,
    lista: <ListIcon className="w-4 h-4 mr-1" />,
    calendario: <Calendar className="w-4 h-4 mr-1" />,
    gantt: <BarChart3 className="w-4 h-4 mr-1" />
  };

  const viewLabels = {
    kanban: 'Kanban',
    lista: 'Lista',
    calendario: 'Calendario',
    gantt: 'Gantt'
  };

  return (
    <div 
      className="flex flex-col gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2" 
      style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
    >
      {/* Búsqueda - Siempre arriba en mobile */}
      {onSearchChange && (
        <div className="relative w-full">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm rounded-lg sm:rounded-xl border-2 outline-none transition-colors focus:border-gray-300"
            style={{ borderColor: '#E5E7EB' }}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Toggle de vistas */}
        {views.length > 0 && onViewChange && (
          <div className="flex items-center gap-1 p-1 rounded-lg sm:rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            {views.map((view) => (
              <Button
                key={view}
                size="sm"
                variant={activeView === view ? 'default' : 'ghost'}
                onClick={() => onViewChange(view)}
                className="text-xs sm:text-sm px-2 sm:px-3"
                style={activeView === view ? { background: primaryColor, color: '#FFFFFF' } : {}}
              >
                {viewIcons[view]}
                <span className="hidden sm:inline">{viewLabels[view]}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Filtros */}
        {onFilter && (
          <Button variant="outline" size="sm" className="border-2 text-xs sm:text-sm" onClick={onFilter}>
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
        )}

        {/* Exportar */}
        {onExport && (
          <Button variant="outline" size="sm" className="border-2 text-xs sm:text-sm" onClick={onExport}>
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        )}

        {/* Acciones extras */}
        {extraActions}

        {/* Botón de agregar - Destacado */}
        {onAdd && (
          <Button size="sm" className="text-xs sm:text-sm ml-auto" style={{ background: primaryColor, color: '#FFFFFF' }} onClick={onAdd}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{addButtonText}</span>
          </Button>
        )}
      </div>
    </div>
  );
}