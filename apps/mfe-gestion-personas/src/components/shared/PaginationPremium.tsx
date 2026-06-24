import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PaginationPremiumProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  onItemsPerPageChange?: (items: number) => void;
  itemsPerPageOptions?: number[];
}

export function PaginationPremium({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100]
}: PaginationPremiumProps) {
  // Protección contra valores inválidos
  const safeTotalPages = totalPages > 0 ? totalPages : 1;
  const safeCurrentPage = currentPage > 0 ? currentPage : 1;
  const safeItemsPerPage = itemsPerPage > 0 ? itemsPerPage : 10;
  const safeTotalItems = totalItems >= 0 ? totalItems : 0;
  
  const startItem = (safeCurrentPage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * safeItemsPerPage, safeTotalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(safeTotalPages);
      } else if (safeCurrentPage >= safeTotalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = safeTotalPages - 3; i <= safeTotalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(safeTotalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Info de items y selector */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div>
          Mostrando <span className="font-bold text-gray-900">{safeTotalItems > 0 ? startItem : 0}</span> a{' '}
          <span className="font-bold text-gray-900">{endItem}</span> de{' '}
          <span className="font-bold text-gray-900">{safeTotalItems}</span> resultados
        </div>
        
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
            <label htmlFor="itemsPerPage" className="text-gray-500">Filas por página:</label>
            <select
              id="itemsPerPage"
              value={safeItemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#003DA5] focus:border-[#003DA5] p-1.5 cursor-pointer outline-none"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Primera página */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Primera página"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </button>

        {/* Página anterior */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        {/* Números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isActive = pageNumber === safeCurrentPage;

            return (
              <motion.button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`min-w-[40px] px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white shadow-md'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                whileHover={!isActive ? { scale: 1.05 } : {}}
                whileTap={!isActive ? { scale: 0.95 } : {}}
              >
                {pageNumber}
              </motion.button>
            );
          })}
        </div>

        {/* Mobile: Solo muestra página actual */}
        <div className="sm:hidden px-4 py-2 bg-gray-100 rounded-lg">
          <span className="text-sm font-semibold text-gray-900">
            {safeCurrentPage} / {safeTotalPages}
          </span>
        </div>

        {/* Página siguiente */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {/* Última página */}
        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage === safeTotalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Última página"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}