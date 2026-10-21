import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';

import { SoporteDeDevolucion } from '../../types';
import { DocumentoVisible, VisorDocumento } from './VisorDocumento';

/**
 * Los enlaces a los archivos con las correcciones de una devolución.
 *
 * Abren el visor en vez de descargar: quien corrige quiere leer lo marcado al
 * lado de lo que está corrigiendo, no buscarlo en la carpeta de descargas.
 * Una devolución puede traer varios (migración 093): va uno por línea.
 */
export function VerSoportes({ soportes }: { soportes?: SoporteDeDevolucion[] | null }) {
  const [abierto, setAbierto] = useState<DocumentoVisible | null>(null);
  const visibles = (soportes ?? []).filter((s) => !!s.descargaUrl);
  if (!visibles.length) return null;

  return (
    <>
      <div className="flex flex-col items-start">
        {visibles.map((soporte, i) => (
          <button
            key={`${soporte.descargaUrl}-${i}`}
            type="button"
            onClick={() =>
              setAbierto({
                nombre: soporte.nombre,
                descargaUrl: soporte.descargaUrl!,
                mimeType: soporte.mimeType,
              })
            }
            className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-bold text-[#003DA5] hover:underline text-left"
          >
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            Ver las correcciones · {soporte.nombre}
          </button>
        ))}
      </div>
      <VisorDocumento documento={abierto} onClose={() => setAbierto(null)} />
    </>
  );
}
