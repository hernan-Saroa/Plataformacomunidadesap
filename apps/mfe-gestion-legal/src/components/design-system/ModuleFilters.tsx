/**
 * ModuleFilters.tsx - COMPONENTE REUTILIZABLE PARA FILTROS
 * Parte del Design System ESAP - Backoffice Gestión Legal
 * ✅ RESPONSIVE MOBILE-FIRST mejorado
 */

import React from 'react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
import { Button } from '@esap-mfe/shared-ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Filter, Search, XCircle, ChevronDown, ChevronUp, SlidersHorizontal, Calendar } from 'lucide-react';
import { useResponsive } from '@esap-mfe/shared-hooks/useResponsive';

// ==================== TYPES ====================

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  /** Tipo de filtro */
  type: 'select' | 'date' | 'custom' | 'date-range';
  
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

  /** Render filters without a card container (borderless, bg-transparent) */
  borderless?: boolean;

  /** Elementos adicionales a renderizar en la barra (ej: dropdown de tableros) */
  children?: React.ReactNode;
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
  className = '',
  borderless = false,
  children
}: ModuleFiltersProps) {
  // ✅ Hook responsive
  const { isMobile, isTablet } = useResponsive();

  // Estado para colapsar/expandir la barra de búsqueda
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(searchValue !== '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sincronizar si cambia el searchValue externamente
  React.useEffect(() => {
    if (searchValue !== '') {
      setIsSearchExpanded(true);
    }
  }, [searchValue]);

  const handleSearchClick = () => {
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleBlur = () => {
    if (searchValue === '') {
      setIsSearchExpanded(false);
    }
  };

  // Contar cuántos filtros avanzados están activos
  const activeAdvancedCount = React.useMemo(() => {
    return filters.filter(f => {
      if (f.type === 'select') {
        return f.value !== '' && f.value !== 'TODOS' && f.value !== 'TODAS' && f.value !== 'ALL';
      }
      return f.value !== '';
    }).length;
  }, [filters]);

  // Estado para colapsar/expandir los filtros avanzados inline
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(activeAdvancedCount > 0);

  // Mantener abierto si se activan filtros externamente
  React.useEffect(() => {
    if (activeAdvancedCount > 0) {
      setIsAdvancedOpen(true);
    }
  }, [activeAdvancedCount]);

  const hasActiveFilters = React.useMemo(() => {
    return searchValue !== '' || activeAdvancedCount > 0;
  }, [searchValue, activeAdvancedCount]);

  return (
    <div className={borderless ? `module-filters-container w-full ${className}` : `module-filters-container bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden p-1.5 sm:p-2 ${className}`}>
      <div className="space-y-0">
        
        {/* Barra Única (elementos alineados que se adaptan con container queries) */}
        <div className="module-filters-row">
          
          {/* Búsqueda + Filtros Avanzados */}
          <div className="module-filters-left-group">
            {/* Campo de Búsqueda - Siempre visible e intuitivo con placeholder */}
            <div 
              className="module-filters-search-input-container relative flex items-center h-9 border border-gray-300 bg-white rounded-lg shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
            >
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex-shrink-0" />
              
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-full text-[11px] bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 w-full pl-8 pr-7 font-medium"
              />

              {searchValue && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchChange('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botón de alternancia de filtros avanzados */}
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={`module-filters-toggle-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all h-9 shadow-sm flex-shrink-0 ${
                  isAdvancedOpen 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                {activeAdvancedCount > 0 && (
                  <span className="flex items-center justify-center w-4.5 h-4.5 text-[9px] font-black bg-blue-600 text-white rounded-full px-1 min-w-[18px]">
                    {activeAdvancedCount}
                  </span>
                )}
                {isAdvancedOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
            )}

            {/* Contenedor animado de filtros para transición fluida */}
            <div className={`module-filters-advanced transition-all duration-300 ease-in-out ${
              isAdvancedOpen 
                ? 'opacity-100 pointer-events-auto' 
                : 'hidden opacity-0 pointer-events-none'
            }`}>
              {filters.map((filter, index) => (
                <div key={index} className="module-filters-advanced-item">
                  <FilterField filter={filter} isMobile={isMobile} />
                </div>
              ))}
            </div>
          </div>

          {children && (
            <div className="module-filters-custom-children flex items-center flex-shrink-0">
              {children}
            </div>
          )}

          {/* Acciones de Limpieza y Contador */}
          <div className="module-filters-actions-wrapper">
            {showCounter && totalItems !== undefined && filteredItems !== undefined && (
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md font-semibold">
                {counterText || (
                  <>
                    Mostrando <span className="font-bold text-gray-700">{filteredItems}</span> de{' '}
                    <span className="font-bold text-gray-700">{totalItems}</span>
                  </>
                )}
              </div>
            )}

            {onClearFilters && hasActiveFilters && (
              <Button
                onClick={onClearFilters}
                variant="ghost"
                size="sm"
                className="text-xs font-black text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-2 rounded-lg flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ==================== DATE RANGE PICKER FIELD ====================

function DateRangePickerField({ filter }: { filter: FilterConfig }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const [fromVal, toVal] = filter.value ? filter.value.split(':') : ['', ''];
  const [tempFrom, setTempFrom] = React.useState(fromVal);
  const [tempTo, setTempTo] = React.useState(toVal);

  // Sincronizar estado temporal si cambia el valor externamente
  React.useEffect(() => {
    setTempFrom(fromVal);
    setTempTo(toVal);
  }, [fromVal, toVal]);

  // Cerrar al dar clic afuera
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    if (tempFrom && tempTo) {
      filter.onChange(`${tempFrom}:${tempTo}`);
    } else if (!tempFrom && !tempTo) {
      filter.onChange('');
    }
    setIsOpen(false);
  };

  const handlePreset = (preset: string) => {
    const today = new Date();
    let fromDate = new Date();
    
    if (preset === 'today') {
      // hoy
    } else if (preset === '7days') {
      fromDate.setDate(today.getDate() - 7);
    } else if (preset === '30days') {
      fromDate.setDate(today.getDate() - 30);
    } else if (preset === 'month') {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'clear') {
      setTempFrom('');
      setTempTo('');
      filter.onChange('');
      setIsOpen(false);
      return;
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];
    setTempFrom(fromStr);
    setTempTo(toStr);
    filter.onChange(`${fromStr}:${toStr}`);
    setIsOpen(false);
  };

  const formatDisplay = () => {
    if (!fromVal && !toVal) return filter.placeholder || 'Rango';
    return `${fromVal} al ${toVal}`;
  };

  return (
    <div className="relative flex items-center gap-1 w-32 sm:w-36 lg:w-40 flex-shrink-0" ref={dropdownRef}>
      {filter.label && (
        <span className="sr-only">
          {filter.label}
        </span>
      )}
      <button
        type="button"
        aria-label={filter.label}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 h-9 transition-all shadow-sm hover:bg-gray-50/50"
      >
        <div className="flex items-center gap-2 truncate text-xs font-bold">
          <Calendar className="w-4 h-4 text-gray-400/80 flex-shrink-0 opacity-50" />
          <span className="truncate">{formatDisplay()}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400/80 flex-shrink-0 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-3 gap-3">
            {/* Presets */}
            <div className="col-span-1 border-r border-gray-100 pr-2 flex flex-col gap-1.5 justify-start text-[10px]">
              <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 block">Rápidos</span>
              <button type="button" onClick={() => handlePreset('today')} className="text-left px-1.5 py-1 rounded hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors font-bold">Hoy</button>
              <button type="button" onClick={() => handlePreset('7days')} className="text-left px-1.5 py-1 rounded hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors font-bold">Últimos 7d</button>
              <button type="button" onClick={() => handlePreset('30days')} className="text-left px-1.5 py-1 rounded hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors font-bold">Últimos 30d</button>
              <button type="button" onClick={() => handlePreset('month')} className="text-left px-1.5 py-1 rounded hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors font-bold">Este mes</button>
              <button type="button" onClick={() => handlePreset('clear')} className="text-left px-1.5 py-1 rounded hover:bg-red-50 hover:text-red-700 text-red-600 transition-colors font-black">Limpiar</button>
            </div>
            
            {/* Inputs manuales */}
            <div className="col-span-2 flex flex-col gap-2">
              <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block">Personalizado</span>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 mb-0.5">DESDE</label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none h-7 bg-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 mb-0.5">HASTA</label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none h-7 bg-white"
                />
              </div>
              <div className="flex gap-1 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded font-bold transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FILTER FIELD COMPONENT ====================

interface FilterFieldProps {
  filter: FilterConfig;
  isMobile: boolean;
}

function FilterField({ filter, isMobile }: FilterFieldProps) {
  if (filter.type === 'custom') {
    return (
      <div>
        {filter.customContent}
      </div>
    );
  }

  if (filter.type === 'date-range') {
    return (
      <DateRangePickerField filter={filter} />
    );
  }

  if (filter.type === 'select') {
    return (
      <div className="flex items-center gap-1 w-32 sm:w-36 lg:w-40 flex-shrink-0">
        {filter.label && (
          <label className="sr-only">
            {filter.label}
          </label>
        )}
        <Select
          value={filter.value}
          onValueChange={filter.onChange}
        >
          <SelectTrigger 
            aria-label={filter.label}
            className="w-full !px-2.5 !py-1.5 rounded-lg border border-gray-300 !text-xs bg-white !h-9 !min-h-0 font-bold text-gray-700 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 hover:bg-gray-50/50 transition-colors"
          >
            <SelectValue placeholder={filter.label || 'Seleccionar...'} />
          </SelectTrigger>
          <SelectContent className="z-[100000]">
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs font-semibold text-gray-700">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (filter.type === 'date') {
    return (
      <div className="flex items-center gap-1 w-32 sm:w-36 lg:w-40 flex-shrink-0">
        {filter.label && (
          <label className="sr-only">
            {filter.label}
          </label>
        )}
        <input
          type="date"
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          aria-label={filter.label}
          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent h-9 bg-white font-bold text-gray-700 shadow-sm"
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
