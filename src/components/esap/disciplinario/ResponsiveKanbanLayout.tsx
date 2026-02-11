/**
 * RESPONSIVE KANBAN LAYOUT - World-Class UX
 * Layout adaptable para Kanban board:
 * - Mobile: Vista de carrusel horizontal con snap scroll
 * - Tablet: 2 columnas adaptables
 * - Desktop: 3-4 columnas dependiendo del espacio
 * - Large Desktop: 4-5 columnas con espacio óptimo
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Columns3, List } from 'lucide-react';
import { useResponsive } from './hooks/useResponsive';

interface ResponsiveKanbanLayoutProps {
  columns: {
    id: string;
    title: string;
    color: string;
    count: number;
    children: React.ReactNode;
  }[];
  showMobileNavigation?: boolean;
}

export function ResponsiveKanbanLayout({
  columns,
  showMobileNavigation = true,
}: ResponsiveKanbanLayoutProps) {
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Calcular número de columnas según ancho
  const getColumnsCount = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (width < 1366) return 3;
    if (width < 1920) return 4;
    return 5; // Large desktop
  };

  const columnsCount = getColumnsCount();

  // Scroll a columna específica en móvil
  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current && isMobile) {
      const container = scrollContainerRef.current;
      const columnWidth = container.clientWidth;
      container.scrollTo({
        left: index * columnWidth,
        behavior: 'smooth',
      });
      setActiveColumnIndex(index);
    }
  };

  // Detectar scroll en móvil para actualizar columna activa
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const columnWidth = container.clientWidth;
      const newIndex = Math.round(scrollLeft / columnWidth);
      setActiveColumnIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Vista de lista para móvil (alternativa al Kanban)
  if (isMobile && viewMode === 'list') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Toggle de vista */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Vista de Lista</h3>
          <button
            onClick={() => setViewMode('kanban')}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition"
          >
            <Columns3 className="w-4 h-4" />
            Kanban
          </button>
        </div>

        {/* Lista de todas las columnas */}
        <div className="flex-1 overflow-y-auto">
          {columns.map((column) => (
            <div key={column.id} className="mb-4">
              <div
                className="px-4 py-2 sticky top-0 z-10 bg-white border-b"
                style={{ borderLeftWidth: '4px', borderLeftColor: column.color }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">{column.title}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                    {column.count}
                  </span>
                </div>
              </div>
              <div className="px-4 py-2 space-y-2">
                {column.children}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con navegación móvil */}
      {isMobile && showMobileNavigation && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                {columns[activeColumnIndex]?.title}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                {columns[activeColumnIndex]?.count || 0}
              </span>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200 transition"
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>

          {/* Indicadores de columnas */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => scrollToColumn(Math.max(0, activeColumnIndex - 1))}
              disabled={activeColumnIndex === 0}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
              {columns.map((column, index) => (
                <button
                  key={column.id}
                  onClick={() => scrollToColumn(index)}
                  className={`flex-shrink-0 h-1.5 rounded-full transition-all ${index === activeColumnIndex ? 'w-8' : 'w-1.5'
                    }`}
                  style={{
                    backgroundColor:
                      index === activeColumnIndex ? column.color : '#D1D5DB',
                  }}
                />
              ))}
            </div>

            <button
              onClick={() =>
                scrollToColumn(Math.min(columns.length - 1, activeColumnIndex + 1))
              }
              disabled={activeColumnIndex === columns.length - 1}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid de columnas */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden ${isMobile
            ? 'snap-x snap-mandatory'
            : isTablet
              ? 'px-4 py-4'
              : 'px-6 py-4'
          }`}
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? `repeat(${columns.length}, 100%)`
            : isTablet
              ? 'repeat(2, minmax(300px, 1fr))'
              : `repeat(${columnsCount}, minmax(320px, 1fr))`,
          gap: isMobile ? '0' : isTablet ? '12px' : '16px',
          gridAutoFlow: 'column',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {columns.map((column, index) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex flex-col ${isMobile
                ? 'snap-start px-4'
                : 'min-w-0'
              }`}
            style={{
              height: '100%',
            }}
          >
            {/* Header de columna */}
            {!isMobile && (
              <div
                className="flex-shrink-0 rounded-t-xl px-4 py-3 border-b-4"
                style={{
                  background: `linear-gradient(135deg, ${column.color}15 0%, ${column.color}08 100%)`,
                  borderBottomColor: column.color,
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {column.title}
                  </h3>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: column.color }}
                  >
                    {column.count}
                  </span>
                </div>
              </div>
            )}

            {/* Contenido de la columna con scroll */}
            <div
              className={`flex-1 overflow-y-auto ${isMobile ? 'pt-2 pb-4' : 'p-3 bg-gray-50/50'
                }`}
              style={{
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {column.children}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
