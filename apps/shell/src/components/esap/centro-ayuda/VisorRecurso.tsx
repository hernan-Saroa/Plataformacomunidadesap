/**
 * Ventana donde se ve un recurso del Centro de Ayuda: el video en el
 * reproductor del navegador y los documentos en OnlyOffice.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Download, X } from 'lucide-react';
import {
  urlArchivoRecurso,
  type RecursoCentroAyuda,
} from '../../../services/api/centroAyuda.service';
import { VisorOnlyOfficeRecurso } from './VisorOnlyOfficeRecurso';

interface Props {
  recurso: RecursoCentroAyuda;
  onCerrar: () => void;
}

export function VisorRecurso({ recurso, onCerrar }: Props) {
  const [fallo, setFallo] = useState<string | null>(null);
  const esVideo = Boolean(recurso.archivo?.esVideo);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={recurso.titulo}
      onClick={onCerrar}
    >
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[--esap-gray-200] px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[--esap-gray-900]">{recurso.titulo}</h3>
            {recurso.archivo && (
              <p className="truncate text-xs text-[--esap-gray-600]">{recurso.archivo.nombre}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <a
              href={urlArchivoRecurso(recurso.id, true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[--esap-primary] hover:bg-blue-50"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar
            </a>
            <button
              onClick={onCerrar}
              className="rounded-lg p-2 hover:bg-[--esap-gray-100]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-[--esap-gray-700]" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-black/5">
          {esVideo ? (
            <video
              src={urlArchivoRecurso(recurso.id)}
              controls
              autoPlay
              className="h-full w-full bg-black"
            >
              Su navegador no puede reproducir este video.
            </video>
          ) : fallo ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <p className="text-sm text-[--esap-gray-700]">{fallo}</p>
              <a
                href={urlArchivoRecurso(recurso.id, true)}
                className="flex items-center gap-2 rounded-lg bg-[--esap-primary] px-4 py-2 text-xs font-medium text-white hover:bg-[--esap-primary-dark]"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar el archivo
              </a>
            </div>
          ) : (
            <VisorOnlyOfficeRecurso recursoId={recurso.id} onFallo={setFallo} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
