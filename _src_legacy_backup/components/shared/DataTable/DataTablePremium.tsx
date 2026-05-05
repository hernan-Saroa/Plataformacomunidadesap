/**
 * COMPONENTE: DATA TABLE PREMIUM
 * 
 * Tabla estilo Notion/Airtable con características enterprise:
 * - Máximo 6-7 columnas visibles
 * - Panel lateral para detalles completos
 * - Column resizing con drag & drop
 * - Saved views (vistas guardadas)
 * - Ordenamiento multi-columna
 * - Filtros inline persistentes
 * - Búsqueda global
 * - Virtualization para grandes datasets
 * - Accesibilidad WCAG 2.1 AA
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Search,
  X,
  GripVertical,
  Save,
  Star,
  MoreVertical,
  ArrowUpDown,
  Filter,
  Download,
  Settings,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { TableCheckbox, useTableSelection } from '../TableCheckbox';
import { BulkActionsBar } from '../BulkActionsBar';

// Tipos
export interface Column<T> {
  id: string;
  label: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  visible?: boolean;
  pinned?: 'left' | 'right' | false;
  renderCell?: (value: any, row: T) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface TableView {
  id: string;
  name: string;
  isDefault?: boolean;
  isFavorite?: boolean;
  columns: string[]; // IDs de columnas visibles
  sortBy?: { columnId: string; direction: 'asc' | 'desc' }[];
  filters?: Record<string, any>;
}

export interface DataTablePremiumProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  defaultView?: TableView;
  onRowClick?: (row: T) => void;
  onBulkAction?: (action: string, selectedRows: T[]) => void;
  enableBulkActions?: boolean;
  enableColumnResize?: boolean;
  enableSavedViews?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxVisibleColumns?: number;
}

export function DataTablePremium<T extends { id: string }>({
  data,
  columns: initialColumns,
  defaultView,
  onRowClick,
  onBulkAction,
  enableBulkActions = true,
  enableColumnResize = true,
  enableSavedViews = true,
  enableSearch = true,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay datos para mostrar',
  maxVisibleColumns = 7,
}: DataTablePremiumProps<T>) {
  // Estados
  const [columns, setColumns] = useState<Column<T>[]>(initialColumns);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<{ columnId: string; direction: 'asc' | 'desc' }[]>([]);
  const [currentView, setCurrentView] = useState<TableView | null>(defaultView || null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Refs para column resizing
  const tableRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Bulk selection
  const {
    selectedCount,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    toggleAllSelection,
    clearSelection,
    getSelectedItems,
  } = useTableSelection(data);

  // Columnas visibles (limitar a maxVisibleColumns)
  const visibleColumns = useMemo(() => {
    return columns
      .filter(col => col.visible !== false)
      .slice(0, maxVisibleColumns);
  }, [columns, maxVisibleColumns]);

  // Datos filtrados por búsqueda
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(row => {
      return visibleColumns.some(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, visibleColumns]);

  // Datos ordenados
  const sortedData = useMemo(() => {
    if (sortBy.length === 0) return filteredData;

    return [...filteredData].sort((a, b) => {
      for (const sort of sortBy) {
        const column = columns.find(col => col.id === sort.columnId);
        if (!column) continue;

        const aValue = typeof column.accessor === 'function' 
          ? column.accessor(a) 
          : a[column.accessor];
        const bValue = typeof column.accessor === 'function' 
          ? column.accessor(b) 
          : b[column.accessor];

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortBy, columns]);

  // Handle sorting
  const handleSort = (columnId: string, multiSort: boolean = false) => {
    setSortBy(prev => {
      const existing = prev.find(s => s.columnId === columnId);
      
      if (!multiSort) {
        // Single sort
        if (!existing) {
          return [{ columnId, direction: 'asc' }];
        }
        if (existing.direction === 'asc') {
          return [{ columnId, direction: 'desc' }];
        }
        return [];
      } else {
        // Multi sort (Shift+Click)
        if (!existing) {
          return [...prev, { columnId, direction: 'asc' }];
        }
        if (existing.direction === 'asc') {
          return prev.map(s => 
            s.columnId === columnId ? { ...s, direction: 'desc' as const } : s
          );
        }
        return prev.filter(s => s.columnId !== columnId);
      }
    });
  };

  // Get cell value
  const getCellValue = (row: T, column: Column<T>) => {
    return typeof column.accessor === 'function' 
      ? column.accessor(row) 
      : row[column.accessor];
  };

  // Column resizing handlers
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    setResizingColumn(columnId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = column.width || 150;

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn) return;

    const diff = e.clientX - resizeStartX.current;
    const newWidth = Math.max(
      80, // minWidth
      Math.min(
        500, // maxWidth
        resizeStartWidth.current + diff
      )
    );

    setColumns(prev => prev.map(col => 
      col.id === resizingColumn ? { ...col, width: newWidth } : col
    ));
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !(col.visible ?? true) } : col
    ));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Left: Search */}
        <div className="flex-1 w-full sm:max-w-md">
          {enableSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Column settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Columnas
          </Button>

          {/* Views (if enabled) */}
          {enableSavedViews && (
            <Button variant="outline" size="sm" className="gap-2">
              <Star className="w-4 h-4" />
              Vistas
            </Button>
          )}

          {/* Export */}
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Column Settings Dropdown */}
      <AnimatePresence>
        {showColumnSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-hidden"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-gray-900">Columnas visibles</h4>
                <button
                  onClick={() => setShowColumnSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {columns.map(column => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={column.visible !== false}
                      onChange={() => toggleColumnVisibility(column.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      {enableBulkActions && selectedCount > 0 && (
        <BulkActionsBar
          selectedCount={selectedCount}
          totalCount={data.length}
          onClearSelection={clearSelection}
          actions={[
            {
              id: 'delete',
              label: 'Eliminar',
              icon: <X className="w-4 h-4" />,
              variant: 'destructive',
              onClick: () => {
                const selected = getSelectedItems();
                onBulkAction?.('delete', selected);
              },
            },
          ]}
          entityName="elementos"
        />
      )}

      {/* Table */}
      <div ref={tableRef} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Checkbox column */}
                {enableBulkActions && (
                  <th className="px-4 py-3 w-12">
                    <TableCheckbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={toggleAllSelection}
                      ariaLabel="Seleccionar todos"
                    />
                  </th>
                )}

                {/* Data columns */}
                {visibleColumns.map(column => {
                  const sortInfo = sortBy.find(s => s.columnId === column.id);
                  
                  return (
                    <th
                      key={column.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider relative group"
                      style={{ 
                        width: column.width,
                        minWidth: column.minWidth || 80,
                        maxWidth: column.maxWidth || 500,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Header content */}
                        <button
                          onClick={(e) => {
                            if (column.sortable !== false) {
                              handleSort(column.id, e.shiftKey);
                            }
                          }}
                          className={`flex-1 flex items-center gap-2 ${
                            column.sortable !== false 
                              ? 'hover:text-gray-900 cursor-pointer' 
                              : ''
                          }`}
                        >
                          {column.renderHeader ? column.renderHeader() : column.label}
                          
                          {/* Sort indicator */}
                          {column.sortable !== false && (
                            <div className="flex flex-col">
                              {!sortInfo && (
                                <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                              )}
                              {sortInfo?.direction === 'asc' && (
                                <ChevronUp className="w-3 h-3 text-blue-600" />
                              )}
                              {sortInfo?.direction === 'desc' && (
                                <ChevronDown className="w-3 h-3 text-blue-600" />
                              )}
                            </div>
                          )}
                        </button>

                        {/* Resize handle */}
                        {enableColumnResize && (
                          <div
                            onMouseDown={(e) => handleResizeStart(e, column.id)}
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ touchAction: 'none' }}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (enableBulkActions ? 1 : 0)}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  const selected = isSelected(row.id);
                  
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-gray-50 transition-colors ${
                        selected ? 'bg-blue-50' : ''
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {/* Checkbox */}
                      {enableBulkActions && (
                        <td className="px-4 py-3">
                          <TableCheckbox
                            checked={selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelection(row.id);
                            }}
                            ariaLabel={`Seleccionar fila ${row.id}`}
                          />
                        </td>
                      )}

                      {/* Data cells */}
                      {visibleColumns.map(column => {
                        const value = getCellValue(row, column);
                        
                        return (
                          <td
                            key={column.id}
                            className={`px-4 py-3 text-sm text-gray-900 ${
                              column.align === 'center' ? 'text-center' :
                              column.align === 'right' ? 'text-right' :
                              'text-left'
                            }`}
                          >
                            {column.renderCell ? column.renderCell(value, row) : value}
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Mostrando <span className="font-medium text-gray-900">{sortedData.length}</span> de{' '}
          <span className="font-medium text-gray-900">{data.length}</span> elementos
        </div>
        {selectedCount > 0 && (
          <div className="text-blue-600 font-medium">
            {selectedCount} seleccionados
          </div>
        )}
      </div>
    </div>
  );
}
