/**
 * ModuleFilters.tsx - COMPONENTE REUTILIZABLE PARA FILTROS
 * Parte del Design System ESAP - Backoffice Gestión Legal
 * 
 * PROPÓSITO:
 * Estandarizar las barras de filtros en todos los módulos
 * Eliminar ~400 líneas de código duplicado
 * 
 * USO:
 * <ModuleFilters
 *   searchValue={busqueda}
 *   onSearchChange={setBusqueda}
 *   filters={[
 *     { 
 *       type: 'select',
 *       value: filtroEtapa,
 *       onChange: setFiltroEtapa,
 *       options: [
 *         { value: 'TODAS', label: 'Todas las etapas' },
 *         { value: 'ACTIVA', label: 'Activa' }
 *       ]
 *     }
 *   ]}
 *   totalItems={100}
 *   filteredItems={45}
 *   onClearFilters={() => {...}}
 * />
 */

import React from 'react';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Button } from '../../../ui/button';
import { Filter, Search, XCircle } from 'lucide-react';

// ==================== TYPES ====================

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  /** Tipo de filtro */
  type: 'select' | 'date' | 'custom';
  
  /** Valor actual del filtro */
  value: string;
  
  /** Handler de cambio */
  onChange: (value: string) => void;
  
  /** Opciones para select */
  options?: FilterSelectOption[];
  
  /** Placeholder para inputs */
  placeholder?: string;
  
  /** Label para el filtro (opcional) */
  label?: string;
  
  /** Ancho en columnas (1-4) */
  colSpan?: 1 | 2 | 3 | 4;
  
  /** Contenido custom (para type='custom') */
  customContent?: React.ReactNode;
}

export interface ModuleFiltersProps {
  /** Valor del campo de búsqueda */
  searchValue: string;
  
  /** Handler para cambios en búsqueda */
  onSearchChange: (value: string) => void;
  
  /** Placeholder para búsqueda */
  searchPlaceholder?: string;
  
  /** Array de filtros adicionales */
  filters?: FilterConfig[];
  
  /** Total de items (sin filtrar) */
  totalItems?: number;
  
  /** Items después de aplicar filtros */
  filteredItems?: number;
  
  /** Handler para limpiar todos los filtros */
  onClearFilters?: () => void;
  
  /** Mostrar contador de resultados */
  showCounter?: boolean;
  
  /** Texto customizado para contador */
  counterText?: string;
  
  /** Ocultar header "Filtros de búsqueda" */
  hideHeader?: boolean;
  
  /** Clase CSS adicional */
  className?: string;
}

// ==================== COMPONENT ====================

export function ModuleFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  totalItems,
  filteredItems,
  onClearFilters,
  showCounter = true,
  counterText,
  hideHeader = false,
  className = ''
}: ModuleFiltersProps) {
  // Verificar si hay filtros activos
  const hasActiveFilters = React.useMemo(() => {
    return searchValue !== '' || filters.some(f => {
      if (f.type === 'select') {
        // Considerar activo si no está en valor por defecto
        return f.value !== '' && f.value !== 'TODOS' && f.value !== 'TODAS' && f.value !== 'ALL';
      }
      return f.value !== '';
    });
  }, [searchValue, filters]);

  // Calcular grid columns basado en cantidad de filtros
  const gridCols = React.useMemo(() => {
    const totalFilters = filters.length + 1; // +1 por búsqueda
    if (totalFilters <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalFilters === 3) return 'grid-cols-1 md:grid-cols-3';
    if (totalFilters === 4) return 'grid-cols-1 md:grid-cols-4'; // 4 elementos = 4 columnas
    return 'grid-cols-1 md:grid-cols-4';
  }, [filters.length]);

  return (
    <Card className={`bg-white border border-gray-200 ${className}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        {!hideHeader && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-bold text-sm text-gray-900">Filtros de búsqueda</h3>
          </div>
        )}

        {/* Grid de filtros */}
        <div className={`grid ${gridCols} gap-3`}>
          {/* Campo de búsqueda */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filtros adicionales */}
          {filters.map((filter, index) => (
            <FilterField key={index} filter={filter} />
          ))}
        </div>

        {/* Contador y botón limpiar */}
        {(showCounter || onClearFilters) && (
          <div className="flex items-center justify-between">
            {/* Contador de resultados */}
            {showCounter && totalItems !== undefined && filteredItems !== undefined && (
              <p className="text-sm text-gray-600">
                {counterText || (
                  <>
                    Mostrando <span className="font-bold">{filteredItems}</span> de{' '}
                    <span className="font-bold">{totalItems}</span> resultados
                  </>
                )}
              </p>
            )}

            {/* Botón limpiar filtros */}
            {onClearFilters && hasActiveFilters && (
              <Button
                onClick={onClearFilters}
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ==================== FILTER FIELD COMPONENT ====================

interface FilterFieldProps {
  filter: FilterConfig;
}

function FilterField({ filter }: FilterFieldProps) {
  const colSpanClass = filter.colSpan ? `md:col-span-${filter.colSpan}` : '';

  if (filter.type === 'custom') {
    return (
      <div className={colSpanClass}>
        {filter.customContent}
      </div>
    );
  }

  if (filter.type === 'select') {
    return (
      <div className={colSpanClass}>
        {filter.label && (
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {filter.label}
          </label>
        )}
        <select
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {filter.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (filter.type === 'date') {
    return (
      <div className={colSpanClass}>
        {filter.label && (
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {filter.label}
          </label>
        )}
        <input
          type="date"
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={filter.placeholder}
        />
      </div>
    );
  }

  return null;
}

// ==================== UTILITY HOOKS ====================

/**
 * Hook para manejar filtros de forma consistente
 * 
 * @example
 * const { filters, updateFilter, clearFilters, hasActiveFilters } = useModuleFilters({
 *   busqueda: '',
 *   etapa: 'TODAS',
 *   semaforo: 'TODOS'
 * });
 */
export function useModuleFilters<T extends Record<string, string>>(initialState: T) {
  const [filters, setFilters] = React.useState<T>(initialState);

  const updateFilter = React.useCallback((key: keyof T, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters(initialState);
  }, [initialState]);

  const hasActiveFilters = React.useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (typeof value === 'string') {
        return value !== '' && value !== 'TODOS' && value !== 'TODAS' && value !== 'ALL';
      }
      return false;
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    setFilters
  };
}