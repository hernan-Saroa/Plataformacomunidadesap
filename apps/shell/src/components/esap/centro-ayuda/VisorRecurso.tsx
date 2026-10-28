/**
 * Ventana donde se ve un recurso del Centro de Ayuda: el video en el
 * reproductor del navegador y los documentos en OnlyOffice.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertCircle, Download, X } from 'lucide-react';
import {
  urlArchivoRecurso,
  type RecursoCentroAyuda,
} from '../../../services/api/centroAyuda.service';
import { IconoRecurso, tamanoLegible, tipoDeRecurso } from './IconoRecurso';
import { VisorOnlyOfficeRecurso } from './VisorOnlyOfficeRecurso';
import { SIN_TRANSICION_CSS } from './estilosAnimacion';

interface Props {
  recurso: RecursoCentroAyuda;
  onCerrar: () => void;
}

export function VisorRecurso({ recurso, onCerrar }: Props) {
  const [fallo, setFallo] = useState<string | null>(null);
  const esVideo = Boolean(recurso.archivo?.esVideo);
  const tipo = tipoDeRecurso(recurso);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    cerrarRef.current?.focus();
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  // OnlyOffice toma el foco al cargar y el iframe se queda con las teclas, así
  // que Esc dejaba de cerrar la ventana. Se devuelve el foco a la X; si el
  // usuario hace clic dentro del documento, el teclado vuelve a ser del visor.
  const alCargarDocumento = () => {
    window.setTimeout(() => cerrarRef.current?.focus(), 0);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={recurso.titulo}
      onClick={onCerrar}
      style={SIN_TRANSICION_CSS}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          esVideo ? 'h-auto' : 'h-full max-h-[92vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={SIN_TRANSICION_CSS}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconoRecurso recurso={recurso} className="h-4.5 w-4.5" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">{recurso.titulo}</h3>
              <p className="truncate text-xs text-slate-500">
                {[tipo.etiqueta, recurso.archivo ? tamanoLegible(recurso.archivo.tamano) : null, recurso.archivo?.nombre]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <a
              href={urlArchivoRecurso(recurso.id, true)}
              aria-label="Descargar"
              title="Descargar"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#1e5da8] transition-colors hover:bg-blue-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </a>
            <button
              ref={cerrarRef}
              onClick={onCerrar}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2"
              aria-label="Cerrar (Esc)"
              title="Cerrar (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={esVideo ? 'bg-black' : 'min-h-0 flex-1 bg-slate-100'}>
          {esVideo ? (
            <video
              src={urlArchivoRecurso(recurso.id)}
              controls
              autoPlay
              className="aspect-video max-h-[80vh] w-full bg-black object-contain"
            >
              Su navegador no puede reproducir este video.
            </video>
          ) : fallo ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                <AlertCircle className="h-7 w-7 text-amber-500" />
              </span>
              <p className="max-w-sm text-sm text-slate-700">{fallo}</p>
              <a
                href={urlArchivoRecurso(recurso.id, true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e5da8] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#174a87]"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar el archivo
              </a>
            </div>
          ) : (
            <VisorOnlyOfficeRecurso recursoId={recurso.id} onFallo={setFallo} onListo={alCargarDocumento} />
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
