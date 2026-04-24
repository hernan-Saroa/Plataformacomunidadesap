import { ChevronLeft, ChevronRight } from 'lucide-react';

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


  return (
    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 w-full">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onItemsPerPageChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
              Mostrar:
            </span>
            <select
              value={safeItemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              style={{
                padding: '2px 6px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: '0.75rem',
                color: '#374151',
                outline: 'none',
                background: 'white',
              }}
            >
              {itemsPerPageOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
        
        <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
          Mostrando <strong style={{color: '#111827'}}>{safeTotalItems > 0 ? startItem : 0}</strong> - <strong style={{color: '#111827'}}>{endItem}</strong> de <strong style={{color: '#111827'}}>{safeTotalItems}</strong> registros
        </span>

        {safeTotalPages > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, border: '1px solid #E5E7EB', background: safeCurrentPage === 1 ? '#F9FAFB' : 'white',
                color: safeCurrentPage === 1 ? '#D1D5DB' : '#374151', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', padding: '0 4px' }}>
              Pág {safeCurrentPage} / {safeTotalPages}
            </div>
            
            <button
              onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage === safeTotalPages}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, border: '1px solid #E5E7EB', background: safeCurrentPage === safeTotalPages ? '#F9FAFB' : 'white',
                color: safeCurrentPage === safeTotalPages ? '#D1D5DB' : '#374151', cursor: safeCurrentPage === safeTotalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}