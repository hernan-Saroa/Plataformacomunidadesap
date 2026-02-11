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
  const { isMobile: windowIsMobile } = useResponsive();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // ✅ Nuevo ref para el contenedor padre
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [containerWidth, setContainerWidth] = useState(1200); // Default seguro

  // ✅ RESIZE OBSERVER: Detectar ancho real del contenedor (ignorando sidebars)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // ✅ LÓGICA SMART: Si el contenedor es pequeño (< 700px), activar modo móvil (Carrusel)
  // incluso si estamos en Desktop. Esto arregla el problema con los sidebars abiertos.
  const isEffectiveMobile = windowIsMobile || containerWidth < 700;

  // Scroll a columna específica en móvil
  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // En modo móvil, el ancho de columna es el ancho del contenedor
      // En modo desktop, calculamos basado en el scroll
      const columnWidth = isEffectiveMobile ? container.clientWidth : 320;

      container.scrollTo({
        left: index * columnWidth,
        behavior: 'smooth',
      });
      setActiveColumnIndex(index);
    }
  };

  // Detectar scroll para actualizar columna activa
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isEffectiveMobile) {
        const scrollLeft = container.scrollLeft;
        const columnWidth = container.clientWidth;
        const newIndex = Math.round(scrollLeft / columnWidth);
        setActiveColumnIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isEffectiveMobile]);

  // Vista de lista (alternativa)
  if (isEffectiveMobile && viewMode === 'list') {
    return (
      <div ref={containerRef} className="flex flex-col h-full bg-gray-50">
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
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden">
      {/* Header de Navegación (Solo visible en modo 'Compacto/Móvil') */}
      {isEffectiveMobile && showMobileNavigation && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {columns[activeColumnIndex]?.title}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex-shrink-0">
                {columns[activeColumnIndex]?.count || 0}
              </span>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200 transition flex-shrink-0"
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>

          {/* Indicadores y Flechas */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => scrollToColumn(Math.max(0, activeColumnIndex - 1))}
              disabled={activeColumnIndex === 0}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 flex-1 overflow-hidden">
              {columns.map((column, index) => (
                <button
                  key={column.id}
                  onClick={() => scrollToColumn(index)}
                  className={`flex-shrink-0 h-1.5 rounded-full transition-all ${index === activeColumnIndex ? 'w-6' : 'w-1.5'
                    }`}
                  style={{
                    backgroundColor:
                      index === activeColumnIndex ? column.color : '#E5E7EB',
                  }}
                  aria-label={`Ir a columna ${column.title}`}
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

      {/* 
          ✅ GRID/SCROLL CONTAINER
          - En Móvil (<700px): Snap Scroll horizontal (1 columna a la vez).
          - En Desktop (>700px): Flex horizontal estándar con scroll si es necesario.
      */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 w-full overflow-x-auto overflow-y-hidden ${isEffectiveMobile
            ? 'snap-x snap-mandatory flex'
            : 'flex px-4 py-4 gap-4' // Flex estándar para desktop
          }`}
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {columns.map((column, index) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex flex-col h-full flex-shrink-0 transition-all ${isEffectiveMobile
                ? 'w-full snap-center px-4 pt-2 pb-4' // ✅ Móvil: Ancho completo + Snap
                : 'w-[320px] 2xl:w-[350px]' // ✅ Desktop: Ancho fijo óptimo (NO minmax grid)
              }`}
          >
            {/* Header de columna (Solo Desktop - En móvil está arriba) */}
            {!isEffectiveMobile && (
              <div
                className="flex-shrink-0 rounded-t-xl px-4 py-3 border-b-4 bg-white shadow-sm border border-gray-100 mb-3"
                style={{
                  borderBottomColor: column.color,
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {column.title}
                  </h3>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: column.color }}
                  >
                    {column.count}
                  </span>
                </div>
              </div>
            )}

            {/* Contenido de la columna con scroll vertical */}
            <div
              className={`flex-1 overflow-y-auto rounded-b-xl ${!isEffectiveMobile && 'custom-scrollbar pr-1'
                }`}
            >
              <div className="space-y-3 pb-2">
                {column.children}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
