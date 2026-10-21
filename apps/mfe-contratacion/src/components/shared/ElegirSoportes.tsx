import React from 'react';
import { Paperclip, X } from 'lucide-react';

export const MIME_SOPORTES =
  '.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface Props {
  archivos: File[];
  onCambio: (archivos: File[]) => void;
  /** El texto del enlace cuando todavía no hay ninguno. */
  etiqueta?: string;
}

/**
 * Los archivos con las correcciones que acompañan una devolución.
 *
 * Admite varios (migración 093): quien devuelve suele tener marcado más de un
 * documento, y con uno solo tenía que unirlos a mano o dejar alguno fuera. Se
 * pueden elegir de una vez o en varias vueltas, y cada uno se quita aparte.
 */
export function ElegirSoportes({
  archivos,
  onCambio,
  etiqueta = 'Adjuntar las correcciones (opcional)',
}: Props) {
  return (
    <div className="space-y-1">
      {archivos.length > 0 && (
        <ul className="list-none m-0 p-0 space-y-1">
          {archivos.map((archivo, i) => (
            <li
              key={`${archivo.name}-${i}`}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] text-slate-700"
            >
              <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate" title={archivo.name}>
                {archivo.name}
              </span>
              <button
                type="button"
                onClick={() => onCambio(archivos.filter((_, j) => j !== i))}
                aria-label={`Quitar ${archivo.name}`}
                title="Quitar"
                className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-600 hover:text-[#003DA5] cursor-pointer">
        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {archivos.length ? 'Adjuntar otro archivo' : etiqueta}
        </span>
        <input
          type="file"
          multiple
          className="sr-only"
          aria-label="Documentos con las correcciones"
          accept={MIME_SOPORTES}
          onChange={(e) => {
            const elegidos = Array.from(e.target.files ?? []);
            // Se limpia para que elegir otra vez el mismo archivo dispare el cambio.
            e.target.value = '';
            if (elegidos.length) onCambio([...archivos, ...elegidos]);
          }}
        />
      </label>
    </div>
  );
}
