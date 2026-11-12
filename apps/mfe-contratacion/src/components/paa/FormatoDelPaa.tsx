import React, { useEffect, useState } from 'react';
import { BookOpen, Download, ExternalLink } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Modal } from '../shared/Modal';

const NOMBRE = 'Formato del PAA - Contratación.pdf';

/**
 * La guía de cómo debe venir el Excel del PAA, pintada en la pantalla.
 *
 * Es la misma para todos los territorios y la sirve el hiring-service junto
 * con el lector, así que dice exactamente lo que el lector valida. Se trae como
 * blob, igual que el visor del expediente: el `src` de un `iframe` que apunta
 * al gateway no siempre lleva la cookie de sesión.
 */
export function FormatoDelPaa({ alto = '70vh' }: { alto?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let creada: string | null = null;
    contratacionService.paa
      .formato()
      .then((blob) => {
        creada = URL.createObjectURL(blob);
        if (cancelado) URL.revokeObjectURL(creada);
        else setUrl(creada);
      })
      .catch((e: any) => !cancelado && setError(e.message ?? 'No se pudo abrir la guía del formato'));
    return () => {
      cancelado = true;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, []);

  /** Desde el blob, para que el archivo se baje con su nombre y no con el de la ruta. */
  const bajar = () => {
    if (!url) return;
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = NOMBRE;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-xs text-gray-600">
          Qué columnas, en qué orden y con qué valores debe venir el Excel para que se cargue a la primera. Compártela con quien arma el PAA de cada territorio.
        </p>
        <div className="flex gap-2">
          <a
            href={url ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!url}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 ${url ? '' : 'pointer-events-none opacity-50'}`}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Abrir en otra pestaña
          </a>
          <button
            type="button"
            onClick={bajar}
            disabled={!url}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Descargar
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : !url ? (
        <p className="m-0 text-xs text-gray-400">Cargando la guía del formato…</p>
      ) : (
        <iframe title="Guía del formato del PAA" src={url} className="w-full rounded-lg border border-gray-200" style={{ height: alto }} />
      )}
    </div>
  );
}

/** El enlace a la guía desde donde se carga o se corrige un archivo. */
export function BotonFormatoPaa({ texto = 'Ver el formato del archivo' }: { texto?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003DA5] hover:underline"
      >
        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
        {texto}
      </button>
      <Modal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title="Formato del PAA"
        description="Cómo debe venir el Excel para cargarlo en Contratación"
        size="xlarge"
        icon={<BookOpen className="w-5 h-5" />}
      >
        {abierto && <FormatoDelPaa alto="65vh" />}
      </Modal>
    </>
  );
}
