import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Modal } from './Modal';

/** Lo mínimo para abrir un documento: cómo se llama y de dónde se trae. */
export interface DocumentoVisible {
  nombre: string;
  descargaUrl: string;
  /** Quién lo subió y cuándo, si quien abre el visor lo sabe. */
  detalle?: string;
  /**
   * El tipo real del archivo, cuando quien abre el visor lo conoce.
   *
   * Cuando el documento cumple un formato, `nombre` es el título del
   * requisito —«Memorando de solicitud firmado por el jefe del área»— y no
   * el nombre del archivo, así que no tiene extensión que mirar. Sin el mime
   * un PDF subido así se declaraba «se lee en Word o Excel» y nunca se podía
   * previsualizar, aunque sí se pudiera descargar.
   */
  mimeType?: string | null;
}

interface Props {
  documento: DocumentoVisible | null;
  onClose: () => void;
}

/** Cómo se muestra un archivo, según lo que es. */
export type FormaDeVer = 'pdf' | 'imagen' | 'word' | 'ninguna';

const POR_MIME: Record<string, FormaDeVer> = {
  'application/pdf': 'pdf',
  'image/png': 'imagen',
  'image/jpeg': 'imagen',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
};

const POR_EXTENSION: Record<string, FormaDeVer> = {
  '.pdf': 'pdf',
  '.png': 'imagen',
  '.jpg': 'imagen',
  '.jpeg': 'imagen',
  '.docx': 'word',
};

function extension(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto === -1 ? '' : nombre.slice(punto).toLowerCase();
}

/**
 * Cómo se muestra el documento.
 *
 * Manda el tipo del archivo, y el primero que se conozca: el que declaró quien
 * abre el visor, o el que trae la respuesta del servidor. El nombre es lo
 * último, porque cuando el documento cubre un requisito lleva el título del
 * requisito y no el del archivo.
 *
 * El Word antiguo (.doc) no entra: es un formato binario que nada en el
 * navegador sabe leer, a diferencia del .docx, que es XML comprimido.
 */
export function formaDeVer(mimes: (string | null | undefined)[], nombre: string): FormaDeVer {
  for (const mime of mimes) {
    if (!mime || mime === 'application/octet-stream') continue;
    return POR_MIME[mime.split(';')[0].trim().toLowerCase()] ?? 'ninguna';
  }
  return POR_EXTENSION[extension(nombre)] ?? 'ninguna';
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
 * El Word (.docx) se convierte en el propio navegador —ver el efecto de
 * `docx-preview` más abajo—. El Excel y el Word antiguo (.doc) no se pintan: no
 * se va a incrustar un visor de terceros para leerlos, que mandaría el
 * documento fuera de la entidad. Se dice y se ofrece la descarga.
 */
export function VisorDocumento({ documento, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorWord, setErrorWord] = useState(false);
  const hojaWord = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!documento) return;

    let cancelado = false;
    let creada: string | null = null;

    setUrl(null);
    setArchivo(null);
    setError(null);
    setErrorWord(false);

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
        setArchivo(blob);
      })
      .catch((e: any) => {
        if (!cancelado) setError(e.message ?? 'No se pudo abrir el documento');
      });

    return () => {
      cancelado = true;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [documento]);

  const forma = documento
    ? formaDeVer([documento.mimeType, archivo?.type], documento.nombre)
    : 'ninguna';

  /**
   * El Word se convierte a HTML aquí mismo, con `docx-preview`.
   *
   * Nada sale de la entidad: el archivo ya está descargado en el navegador y
   * la conversión ocurre en él, que es lo que un visor de terceros no permitía.
   * La librería se carga solo cuando se abre un Word, para no sumarle su peso
   * a cada pantalla.
   */
  useEffect(() => {
    if (forma !== 'word' || !archivo || !hojaWord.current) return;
    const destino = hojaWord.current;
    let cancelado = false;
    destino.innerHTML = '';

    import('docx-preview')
      .then(({ renderAsync }) =>
        renderAsync(archivo, destino, undefined, {
          className: 'visor-word',
          inWrapper: true,
          breakPages: true,
        }),
      )
      .catch(() => {
        if (!cancelado) setErrorWord(true);
      });

    return () => {
      cancelado = true;
    };
  }, [forma, archivo]);

  if (!documento) return null;

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
        ) : !url ? (
          <p className="text-xs text-slate-500 m-0 px-5 py-4">Abriendo el documento…</p>
        ) : forma === 'pdf' ? (
          <iframe src={url} title={documento.nombre} className="visor-marco" />
        ) : forma === 'imagen' ? (
          <div className="visor-marco visor-imagen">
            <img src={url} alt={documento.nombre} />
          </div>
        ) : forma === 'word' && !errorWord ? (
          <div ref={hojaWord} className="visor-marco visor-hoja" aria-label={documento.nombre} />
        ) : (
          <div className="px-5 py-8 text-center">
            <FileText className="w-9 h-9 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
            <p className="text-xs font-bold text-gray-600 m-0">
              {errorWord ? 'No se pudo mostrar este Word' : 'Este documento no se puede mostrar aquí'}
            </p>
            <p className="text-[11px] text-gray-400 m-0 mt-1 leading-snug">
              {errorWord
                ? 'Puede estar dañado o protegido. Descárgalo para revisarlo.'
                : 'El visor abre PDF, imágenes y Word (.docx). Los Excel y los Word antiguos (.doc) hay que descargarlos.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
