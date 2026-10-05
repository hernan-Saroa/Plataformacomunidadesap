import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';

import { SoporteDeDevolucion } from '../../types';
import { DocumentoVisible, VisorDocumento } from './VisorDocumento';

/**
 * El enlace al archivo con las correcciones de una devolución.
 *
 * Abre el visor en vez de descargar: quien corrige quiere leer lo marcado al
 * lado de lo que está corrigiendo, no buscarlo en la carpeta de descargas.
 */
export function VerSoporte({ soporte }: { soporte: SoporteDeDevolucion }) {
  const [abierto, setAbierto] = useState<DocumentoVisible | null>(null);
  if (!soporte.descargaUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setAbierto({
            nombre: soporte.nombre,
            descargaUrl: soporte.descargaUrl!,
            mimeType: soporte.mimeType,
          })
        }
        className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-bold text-[#003DA5] hover:underline"
      >
        <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
        Ver las correcciones · {soporte.nombre}
      </button>
      <VisorDocumento documento={abierto} onClose={() => setAbierto(null)} />
    </>
  );
}
