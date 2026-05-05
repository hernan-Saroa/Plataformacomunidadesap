/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: ResponsiveTable - Tabla World-Class Adaptativa
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tabla que automáticamente cambia a vista de cards en mobile
 * Compatible con todas las funcionalidades de tabla (sort, filtros, acciones)
 * 
 * @example
 * <ResponsiveTable
 *   data={procesos}
 *   columns={columns}
 *   breakpoint="lg"
 *   renderMobileCard={(item) => <ProcessCard {...item} />}
 * />
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { useResponsive } from '@esap-mfe/shared-hooks/useResponsive';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface Column<T> {
  key: keyof T | string;
  label: string;
  /** Contenido custom para el header (ej: icono + tooltip). Si existe, reemplaza label. */
  headerContent?: ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, item: T, index: number) => ReactNode;
  hideOnMobile?: boolean;
  className?: string;
}

export interface ResponsiveTableProps<T> {
  // Datos
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  
  // Vista mobile
  renderMobileCard?: (item: T, index: number) => ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  
  // Personalización
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  emptyMessage?: string;
  
  // Eventos
  onRowClick?: (item: T, index: number) => void;
  
  // Loading
  loading?: boolean;
  loadingRows?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  breakpoint = 'lg',
  className = '',
  tableClassName = '',
  headerClassName = '',
  rowClassName = '',
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  loading = false,
  loadingRows = 5
}: ResponsiveTableProps<T>) {
  
  const responsive = useResponsive();
  
  // Determinar si mostrar vista mobile
  const showMobileView = (() => {
    switch (breakpoint) {
      case 'sm': return responsive.width < 640;
      case 'md': return responsive.width < 768;
      case 'lg': return responsive.width < 1024;
      case 'xl': return responsive.width < 1280;
      default: return false;
    }
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA MOBILE (CARDS)
  // ══════════════════════════════════════════════════════════════════════════

  if (showMobileView && renderMobileCard) {
    return (
      <div className={`space-y-4 ${className}`}>
        {loading ? (
          // Loading skeleton para cards
          Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border-2 border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          data.map((item, index) => (
            <motion.div
              key={keyExtractor(item, index)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              onClick={() => onRowClick?.(item, index)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {renderMobileCard(item, index)}
            </motion.div>
          ))
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA DESKTOP (TABLA)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className={`bg-white rounded-xl border-2 border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full ${tableClassName}`}>
          {/* HEADER */}
          <thead className={`bg-gray-100 border-b-2 border-gray-200 ${headerClassName}`}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key) + index}
                  className={`
                    px-6 py-4 text-left text-sm font-bold text-gray-700
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                    ${column.className || ''}
                  `}
                  style={{ width: column.width }}
                >
                  {column.headerContent ?? column.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              // Loading skeleton para tabla
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((column, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => {
                const rowClass = typeof rowClassName === 'function'
                  ? rowClassName(item, rowIndex)
                  : rowClassName;

                return (
                  <tr
                    key={keyExtractor(item, rowIndex)}
                    onClick={() => onRowClick?.(item, rowIndex)}
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${rowClass}
                    `}
                  >
                    {columns.map((column, colIndex) => {
                      const value = item[column.key as keyof T];
                      const content = column.render
                        ? column.render(value, item, rowIndex)
                        : value;

                      return (
                        <td
                          key={String(column.key) + colIndex}
                          className={`
                            px-6 py-4
                            ${column.align === 'center' ? 'text-center' : ''}
                            ${column.align === 'right' ? 'text-right' : ''}
                            ${column.className || ''}
                          `}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE AUXILIAR: MobileCard
// ════════════════════════════════════════════════════════════════════════════

interface MobileCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileCard({ title, subtitle, children, onClick, className = '' }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border-2 border-gray-200 p-4
        ${onClick ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''}
        ${className}
      `}
    >
      <div className="mb-3">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE AUXILIAR: MobileCardRow
// ════════════════════════════════════════════════════════════════════════════

interface MobileCardRowProps {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

export function MobileCardRow({ label, value, valueClassName = '' }: MobileCardRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-semibold text-gray-600">{label}</span>
      <span className={`text-sm text-gray-900 ${valueClassName}`}>{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export default ResponsiveTable;
