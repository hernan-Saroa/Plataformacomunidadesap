import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * ═══════════════════════════════════════════════════════════════
 * RESPONSIVE TABLE - MOBILE FIRST
 * ═══════════════════════════════════════════════════════════════
 * 
 * Patrón:
 * - Mobile (< 1024px): Cards verticales touch-friendly
 * - Desktop (≥ 1024px): Tabla tradicional
 * 
 * Features:
 * ✅ Mobile First (cards por defecto)
 * ✅ Touch targets ≥44px
 * ✅ Scroll horizontal automático en tablet
 * ✅ Sticky header en desktop
 * ✅ Animaciones suaves
 * ✅ 100% reutilizable
 */

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  hideOnMobile?: boolean; // Ocultar en cards mobile
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  
  // Mobile Card Config
  renderMobileCard?: (item: T, index: number) => ReactNode;
  mobileCardClassName?: string;
  
  // Desktop Table Config
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string;
  
  // General
  emptyMessage?: string;
  loading?: boolean;
  stickyHeader?: boolean;
  minWidth?: string;
  
  // Animation
  enableAnimation?: boolean;
  animationDelay?: number;
  
  // Accessibility
  ariaLabel?: string;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export function ResponsiveTable<T extends { id?: string | number }>({
  data,
  columns,
  renderMobileCard,
  mobileCardClassName = '',
  tableClassName = '',
  headerClassName = '',
  rowClassName = '',
  emptyMessage = 'No hay datos para mostrar',
  loading = false,
  stickyHeader = true,
  minWidth = '800px',
  enableAnimation = true,
  animationDelay = 0.05,
  ariaLabel = 'Tabla de datos'
}: ResponsiveTableProps<T>) {
  
  // ✅ Empty state
  if (!loading && data.length === 0) {
    return (
      <div className="
        flex flex-col items-center justify-center 
        py-12 sm:py-16 
        text-center
        bg-gray-50 rounded-lg
      ">
        <svg 
          className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mb-3 sm:mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
          />
        </svg>
        <p className="text-sm sm:text-base font-medium text-gray-600">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // ✅ Loading state
  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="
              h-16 sm:h-20 
              bg-gray-100 
              rounded-lg 
              animate-pulse
            " 
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* 📱 MOBILE VIEW - Cards */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="lg:hidden divide-y divide-gray-200">
        <AnimatePresence mode="popLayout">
          {data.map((item, index) => {
            const itemId = item.id || index;
            
            return (
              <motion.div
                key={itemId}
                initial={enableAnimation ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.2,
                  delay: enableAnimation ? index * animationDelay : 0,
                }}
                className={`
                  p-4 sm:p-5 
                  bg-white 
                  hover:bg-gray-50 
                  transition-colors
                  touch-target
                  ${mobileCardClassName}
                `}
              >
                {renderMobileCard ? (
                  renderMobileCard(item, index)
                ) : (
                  <DefaultMobileCard item={item} columns={columns} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 💻 DESKTOP VIEW - Table */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:block overflow-x-auto">
        <table
          className={`w-full border-collapse ${tableClassName}`}
          style={{ minWidth }}
          aria-label={ariaLabel}
        >
          {/* THEAD */}
          <thead
            className={`
              bg-gray-50 
              border-b-2 border-gray-200
              ${stickyHeader ? 'sticky top-0 z-10' : ''}
              ${headerClassName}
            `}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 xl:px-6 
                    py-3 xl:py-4 
                    text-xs 
                    font-bold 
                    text-gray-700 
                    uppercase 
                    tracking-wide
                    ${column.align === 'center' ? 'text-center' : 
                      column.align === 'right' ? 'text-right' : 
                      'text-left'}
                    ${column.headerClassName || ''}
                  `}
                  style={{ 
                    width: column.width,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* TBODY */}
          <tbody className="divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
              {data.map((item, index) => {
                const itemId = item.id || index;
                
                return (
                  <motion.tr
                    key={itemId}
                    initial={enableAnimation ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      duration: 0.2,
                      delay: enableAnimation ? index * animationDelay : 0,
                    }}
                    className={`
                      bg-white 
                      hover:bg-gray-50 
                      transition-colors
                      ${rowClassName}
                    `}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          px-4 xl:px-6 
                          py-3 xl:py-4 
                          text-sm 
                          text-gray-900
                          ${column.align === 'center' ? 'text-center' : 
                            column.align === 'right' ? 'text-right' : 
                            'text-left'}
                          ${column.className || ''}
                        `}
                      >
                        {column.render 
                          ? column.render(item) 
                          : (item as any)[column.key]
                        }
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// DEFAULT MOBILE CARD
// ════════════════════════════════════════════════════════════════

function DefaultMobileCard<T>({ 
  item, 
  columns 
}: { 
  item: T; 
  columns: TableColumn<T>[];
}) {
  const visibleColumns = columns.filter(col => !col.hideOnMobile);
  
  return (
    <div className="space-y-2.5">
      {visibleColumns.map((column) => (
        <div key={column.key} className="flex justify-between items-start gap-3">
          <dt className="
            text-xs sm:text-sm 
            font-semibold 
            text-gray-600 
            uppercase
            min-w-[100px]
            flex-shrink-0
          ">
            {column.header}
          </dt>
          <dd className="
            text-sm sm:text-base 
            text-gray-900 
            font-medium
            text-right
            flex-1
          ">
            {column.render 
              ? column.render(item) 
              : (item as any)[column.key]
            }
          </dd>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPER: Create responsive columns
// ════════════════════════════════════════════════════════════════

export function createColumn<T>(config: TableColumn<T>): TableColumn<T> {
  return {
    align: 'left',
    hideOnMobile: false,
    ...config
  };
}
