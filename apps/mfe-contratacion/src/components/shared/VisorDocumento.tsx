import React, { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Modal } from './Modal';

/** Lo mínimo para abrir un documento: cómo se llama y de dónde se trae. */
export interface DocumentoVisible {
  nombre: string;
  descargaUrl: string;
  /** Quién lo subió y cuándo, si quien abre el visor lo sabe. */
  detalle?: string;
}

interface Props {
  documento: DocumentoVisible | null;
  onClose: () => void;
}

/** Lo que el navegador sabe pintar sin ayuda de nadie. */
const SE_VEN_EN_PANTALLA = ['.pdf'];

function extension(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto === -1 ? '' : nombre.slice(punto).toLowerCase();
}

/**
 * El documento del expediente, abierto sin salir de la actividad (EFDS-1183).
 *
 * Hasta ahora un adjunto solo se podía bajar al disco: el abogado que revisa un
 * estudio previo con cuatro soportes hacía cuatro descargas, los abría por
 * fuera y volvía a la pantalla a decidir. Revisar era un trabajo de escritorio,
 * no de la plataforma, y el expediente electrónico servía de armario.
 *
 * ------------------------------------------- por qué el blob y no el `src` --
 *
 * El `src` de un `iframe` que apunta al gateway es una petición de tercero, y
 * el navegador le manda la cookie de sesión o no según el `SameSite` y según si
 * el shell y el gateway comparten sitio —en despliegue no siempre—. Un visor
 * que funciona en local y sale en blanco en producción es peor que no tenerlo.
 * Con el blob, la petición la hace el mismo `fetch` con `credentials` que el
 * resto del módulo y el visor pinta lo que ya está descargado.
 *
 * Word y Excel no se pintan: ningún navegador los sabe mostrar y no se va a
 * incrustar un visor de terceros para leerlos, que mandaría el documento fuera
 * de la entidad. Se dice y se ofrece la descarga, que es lo que hay.
 */
export function VisorDocumento({ documento, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documento) return;

    let cancelado = false;
    let creada: string | null = null;

    setUrl(null);
    setError(null);

    contratacionService
      .contenidoDocumento(documento.descargaUrl)
      .then((blob) => {
        // Si se cerró el visor mientras llegaba, la url se revoca aquí mismo:
        // dejarla viva mantendría el archivo entero en memoria hasta recargar.
        creada = URL.createObjectURL(blob);
        if (cancelado) {
          URL.revokeObjectURL(creada);
          return;
        }
        setUrl(creada);
      })
      .catch((e: any) => {
        if (!cancelado) setError(e.message ?? 'No se pudo abrir el documento');
      });

    return () => {
      cancelado = true;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [documento]);

  if (!documento) return null;

  const seVe = SE_VEN_EN_PANTALLA.includes(extension(documento.nombre));

  /**
   * Se baja desde el blob y no desde el enlace del gateway.
   *
   * En disco el archivo se llama con el hexadecimal que le puso la carga, así
   * que bajarlo por su dirección deja al usuario con `a1b2…c3.pdf` en la
   * carpeta de descargas. `download` sobre una url de blob —que es del mismo
   * origen— sí respeta el nombre, y el nombre es el del documento.
   */
  const bajar = () => {
    if (!url) return;
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = documento.nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={documento.nombre}
      description={documento.detalle}
      size="full"
      icon={<FileText className="w-4 h-4" />}
      sinPadding
      footer={
        <>
          <button
            type="button"
            onClick={bajar}
            disabled={!url}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
              border border-gray-200 bg-white text-gray-700 hover:border-[#003DA5] hover:text-[#003DA5]
              disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg
              bg-[#003DA5] text-white hover:bg-[#002e7d]"
          >
            Cerrar
          </button>
        </>
      }
    >
      <div className="visor-documento">
        {error ? (
          <p role="alert" className="text-xs font-semibold text-red-600 m-0 px-5 py-4">
            {error}
          </p>
        ) : !seVe ? (
          <div className="px-5 py-8 text-center">
            <FileText className="w-9 h-9 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
            <p className="text-xs font-bold text-gray-600 m-0">
              Este documento se lee en Word o Excel
            </p>
            <p className="text-[11px] text-gray-400 m-0 mt-1 leading-snug">
              El navegador no sabe mostrarlo. Descárgalo para revisarlo.
            </p>
          </div>
        ) : !url ? (
          <p className="text-xs text-slate-500 m-0 px-5 py-4">Abriendo el documento…</p>
        ) : (
          <iframe src={url} title={documento.nombre} className="visor-marco" />
        )}
      </div>
    </Modal>
  );
}
