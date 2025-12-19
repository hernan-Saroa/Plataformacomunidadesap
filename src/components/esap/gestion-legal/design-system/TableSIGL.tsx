/**
 * TABLE SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Sección 2.4 - Tablas
 */

import { ReactNode, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { ButtonSIGL } from './Button';

// ========================================
// TIPOS
// ========================================

export type SortDirection = 'asc' | 'desc' | null;
export type ColumnAlign = 'left' | 'center' | 'right';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: ColumnAlign;
  width?: string;
  render?: (value: any, row: T, index: number) => ReactNode;
}

export interface TableSIGLProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  
  // Sorting
  sortable?: boolean;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: SortDirection) => void;
  
  // Paginación
  pagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  
  // Selección
  selectable?: boolean;
  selectedRows?: string[];
  onSelectRow?: (keys: string[]) => void;
  
  // Estilos
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  
  // Acciones
  onRowClick?: (row: T, index: number) => void;
  
  className?: string;
}

export function TableSIGL<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  
  sortable = true,
  defaultSortKey,
  defaultSortDirection = 'asc',
  onSort,
  
  pagination = false,
  pageSize = 10,
  currentPage = 1,
  totalItems,
  onPageChange,
  
  selectable = false,
  selectedRows = [],
  onSelectRow,
  
  striped = true,
  hoverable = true,
  compact = false,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  
  onRowClick,
  
  className = '',
}: TableSIGLProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Sorting
  const handleSort = (key: string) => {
    if (!sortable) return;

    let newDirection: SortDirection = 'asc';

    if (sortKey === key) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') newDirection = null;
    }

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(key, newDirection);
    }
  };

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination, currentPage, pageSize]);

  // Total pages
  const totalPages = pagination
    ? Math.ceil((totalItems || sortedData.length) / pageSize)
    : 1;

  // Selección
  const isAllSelected = selectable && paginatedData.length > 0 &&
    paginatedData.every((row) => selectedRows.includes(row[keyField]));

  const handleSelectAll = () => {
    if (!onSelectRow) return;

    if (isAllSelected) {
      // Deseleccionar todos
      const keysToRemove = paginatedData.map((row) => row[keyField]);
      onSelectRow(selectedRows.filter((key) => !keysToRemove.includes(key)));
    } else {
      // Seleccionar todos
      const newKeys = paginatedData.map((row) => row[keyField]);
      onSelectRow([...new Set([...selectedRows, ...newKeys])]);
    }
  };

  const handleSelectRow = (key: string) => {
    if (!onSelectRow) return;

    if (selectedRows.includes(key)) {
      onSelectRow(selectedRows.filter((k) => k !== key));
    } else {
      onSelectRow([...selectedRows, key]);
    }
  };

  // Render
  const rowHeight = compact ? '36px' : '44px';

  return (
    <div className={`w-full ${className}`}>
      {/* Table Container */}
      <div
        className="overflow-x-auto"
        style={{
          border: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
          borderRadius: DESIGN_TOKENS.borderRadius.medium,
        }}
      >
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          {/* Header */}
          <thead>
            <tr
              style={{
                background: DESIGN_TOKENS.colors.primary.blue,
                borderBottom: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
              }}
            >
              {/* Checkbox column */}
              {selectable && (
                <th
                  style={{
                    width: '40px',
                    padding: '12px',
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  style={{
                    padding: '12px',
                    textAlign: column.align || 'left',
                    fontSize: '12px',
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.primary.white,
                    textTransform: 'uppercase',
                    cursor: column.sortable !== false && sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: column.width,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ justifyContent: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start' }}>
                    <span>{column.label}</span>
                    {column.sortable !== false && sortable && (
                      <span style={{ opacity: sortKey === column.key ? 1 : 0.5 }}>
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )
                        ) : (
                          <ChevronsUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: DESIGN_TOKENS.colors.neutral.mediumGray,
                  }}
                >
                  Cargando...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: DESIGN_TOKENS.colors.neutral.mediumGray,
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowKey = row[keyField] || rowIndex;
                const isSelected = selectedRows.includes(rowKey);

                return (
                  <motion.tr
                    key={rowKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIndex * 0.02 }}
                    onClick={() => onRowClick?.(row, rowIndex)}
                    style={{
                      height: rowHeight,
                      background: isSelected
                        ? '#D0E2F5'
                        : striped && rowIndex % 2 === 1
                        ? DESIGN_TOKENS.colors.neutral.veryLightGray
                        : DESIGN_TOKENS.colors.primary.white,
                      borderBottom: `1px solid ${DESIGN_TOKENS.colors.primary.light}`,
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.2s',
                    }}
                    whileHover={
                      hoverable
                        ? {
                            backgroundColor: DESIGN_TOKENS.colors.primary.light,
                          }
                        : {}
                    }
                  >
                    {/* Checkbox */}
                    {selectable && (
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowKey)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => {
                      const value = row[column.key];
                      const cellContent = column.render
                        ? column.render(value, row, rowIndex)
                        : value;

                      return (
                        <td
                          key={column.key}
                          style={{
                            padding: '8px 12px',
                            textAlign: column.align || 'left',
                            fontSize: DESIGN_TOKENS.typography.fontSize.body,
                            color: DESIGN_TOKENS.colors.neutral.darkGray,
                            verticalAlign: 'middle',
                          }}
                        >
                          {cellContent}
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

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div
          className="flex items-center justify-between mt-4"
          style={{
            padding: '12px 16px',
            background: DESIGN_TOKENS.colors.neutral.veryLightGray,
            borderRadius: DESIGN_TOKENS.borderRadius.medium,
          }}
        >
          <div
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: DESIGN_TOKENS.colors.neutral.mediumGray,
            }}
          >
            Página {currentPage} de {totalPages}
            {totalItems && (
              <span> • {totalItems} registro{totalItems !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ButtonSIGL
              variant="secondary"
              size="small"
              icon={<ChevronLeft size={16} />}
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              Anterior
            </ButtonSIGL>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum)}
                    style={{
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      borderRadius: DESIGN_TOKENS.borderRadius.small,
                      background:
                        currentPage === pageNum
                          ? DESIGN_TOKENS.colors.primary.blue
                          : 'transparent',
                      color:
                        currentPage === pageNum
                          ? DESIGN_TOKENS.colors.primary.white
                          : DESIGN_TOKENS.colors.neutral.darkGray,
                      fontSize: DESIGN_TOKENS.typography.fontSize.small,
                      fontWeight:
                        currentPage === pageNum
                          ? DESIGN_TOKENS.typography.fontWeight.bold
                          : DESIGN_TOKENS.typography.fontWeight.regular,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <ButtonSIGL
              variant="secondary"
              size="small"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              Siguiente
            </ButtonSIGL>
          </div>
        </div>
      )}
    </div>
  );
}
