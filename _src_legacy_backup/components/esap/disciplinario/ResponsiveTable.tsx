/**
 * RESPONSIVE TABLE - World-Class UX
 * Tabla que se adapta a diferentes pantallas:
 * - Desktop: Tabla tradicional
 * - Tablet: Tabla con scroll horizontal
 * - Mobile: Cards apiladas con toda la información
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { useResponsive } from './hooks/useResponsive';

interface Column {
  key: string;
  label: string;
  width?: string;
  mobileLabel?: string; // Label personalizado para móvil
  render?: (value: any, row: any) => React.ReactNode;
  hideOnMobile?: boolean; // Ocultar en móvil si no es crítico
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  keyField: string;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  mobileCardRender?: (row: any) => React.ReactNode; // Renderizado personalizado para móvil
}

export function ResponsiveTable({
  columns,
  data,
  keyField,
  onRowClick,
  actions,
  emptyMessage = 'No hay datos para mostrar',
  mobileCardRender,
}: ResponsiveTableProps) {
  const { isMobile, isTablet } = useResponsive();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Renderizado móvil con cards
  if (isMobile) {
    if (data.length === 0) {
      return (
        <div className="text-center py-12 px-4">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 px-4 py-3">
        {data.map((row) => {
          const key = row[keyField];
          const isExpanded = expandedRows.has(key);

          // Si hay renderizado personalizado, usarlo
          if (mobileCardRender) {
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {mobileCardRender(row)}
              </motion.div>
            );
          }

          // Renderizado por defecto
          const visibleColumns = columns.filter((col) => !col.hideOnMobile);
          const mainColumns = visibleColumns.slice(0, 2); // Primeras 2 columnas siempre visibles
          const extraColumns = visibleColumns.slice(2); // Resto expandible

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div
                className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {/* Columnas principales */}
                {mainColumns.map((col) => (
                  <div key={col.key} className="mb-2 last:mb-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      {col.mobileLabel || col.label}
                    </p>
                    <div className="text-sm font-bold text-gray-900">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </div>
                  </div>
                ))}

                {/* Botón expandir si hay más columnas */}
                {extraColumns.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(key);
                    }}
                    className="mt-3 w-full py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition flex items-center justify-center gap-2 text-xs font-bold text-gray-700"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Menos información
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Más información
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Columnas expandidas */}
              {isExpanded && extraColumns.length > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2"
                >
                  {extraColumns.map((col) => (
                    <div key={col.key} className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500">
                        {col.mobileLabel || col.label}:
                      </p>
                      <div className="text-xs font-bold text-gray-900 text-right">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Acciones */}
              {actions && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  {actions(row)}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Renderizado de tabla para desktop/tablet
  return (
    <div className={`overflow-x-auto ${isTablet ? 'px-4' : 'px-6'}`}>
      <table className="w-full">
        <thead className="bg-gray-50 border-y border-gray-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-24">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[keyField]}
                className={`${
                  onRowClick
                    ? 'cursor-pointer hover:bg-blue-50/50 active:bg-blue-100/50 transition'
                    : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
