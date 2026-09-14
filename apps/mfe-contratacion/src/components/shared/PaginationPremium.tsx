import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Paginación del módulo.
 *
 * Misma API que la de gestión de personas y PTA, para que el componente se use
 * igual en toda la plataforma; el estilo va en Tailwind, como el resto de este
 * módulo, en vez de estilos en línea.
 */
interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  onItemsPerPageChange?: (items: number) => void;
  itemsPerPageOptions?: number[];
}

const BOTON =
  'w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 ' +
  'text-gray-700 bg-white hover:bg-gray-50 transition-colors ' +
  'disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed';

export function PaginationPremium({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}: Props) {
  // Los datos llegan de arriba: si el listado se vacía mientras se navega,
  // estos valores evitan mostrar "Pág 3 / 0" o rangos negativos.
  const paginas = Math.max(1, totalPages);
  const pagina = Math.min(Math.max(1, currentPage), paginas);
  const porPagina = Math.max(1, itemsPerPage);
  const total = Math.max(0, totalItems);

  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <nav
      aria-label="Paginación de procesos"
      className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full"
    >
      {onItemsPerPageChange && (
        <div className="flex items-center gap-1.5">
          <label htmlFor="por-pagina" className="text-xs font-medium text-gray-500">
            Mostrar:
          </label>
          <select
            id="por-pagina"
            value={porPagina}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-1.5 py-0.5 text-xs text-gray-700 bg-white rounded-md border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
          >
            {itemsPerPageOptions.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* aria-live: al cambiar de página el foco se queda en el botón, así que
          sin esto un lector de pantalla no anuncia que el rango cambió. */}
      <span className="text-xs font-medium text-gray-500 tabular-nums" aria-live="polite">
        Mostrando <strong className="text-gray-900">{desde}</strong> -{' '}
        <strong className="text-gray-900">{hasta}</strong> de{' '}
        <strong className="text-gray-900">{total}</strong> registros
      </span>

      {paginas > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
            className={BOTON}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[13px] font-semibold text-gray-700 px-1 tabular-nums">
            Pág {pagina} / {paginas}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(pagina + 1)}
            disabled={pagina === paginas}
            aria-label="Página siguiente"
            className={BOTON}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
