/**
 * Área de vista previa con OnlyOffice (EFDS-1080).
 *
 * Solo dibuja el documento: el modal, el encabezado y el botón de descarga los
 * pone la pantalla que lo use. Si OnlyOffice no está disponible avisa con
 * `onFallo` para que la pantalla use su visor de respaldo.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  cargarApiOnlyOffice,
  obtenerConfigOnlyOffice,
  type OrigenArchivo,
} from './services/onlyofficeVisor';

interface Props {
  origen: OrigenArchivo;
  id: string;
  /** Se llama si el visor no se puede usar, con el motivo. */
  onFallo?: (motivo: string) => void;
  onListo?: () => void;
}

export function VisorOnlyOffice({ origen, id, onFallo, onListo }: Props) {
  const contenedorId = useRef(`visor-onlyoffice-${Math.random().toString(36).slice(2)}`);
  const editorRef = useRef<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const abrir = async () => {
      try {
        const [config] = await Promise.all([
          obtenerConfigOnlyOffice(origen, id),
          cargarApiOnlyOffice(),
        ]);
        if (cancelado) return;

        const DocsAPI = (window as any).DocsAPI;
        if (!DocsAPI) throw new Error('El visor de documentos no está disponible');

        editorRef.current = new DocsAPI.DocEditor(contenedorId.current, {
          ...config,
          width: '100%',
          height: '100%',
          events: {
            onDocumentReady: () => {
              if (cancelado) return;
              setCargando(false);
              onListo?.();
            },
            onError: (evento: any) => {
              if (cancelado) return;
              console.warn('[VisorOnlyOffice] error del editor', evento?.data || evento);
              onFallo?.(evento?.data?.errorDescription || 'El visor no pudo abrir el documento');
            },
          },
        });
      } catch (err) {
        if (cancelado) return;
        console.warn('[VisorOnlyOffice] no se pudo abrir', err);
        onFallo?.(err instanceof Error ? err.message : 'No se pudo abrir la vista previa');
      }
    };

    abrir();

    return () => {
      cancelado = true;
      try {
        editorRef.current?.destroyEditor?.();
      } catch {
        // el editor ya no existe
      }
      editorRef.current = null;
    };
  }, [origen, id]);

  return (
    <div className="relative h-full w-full bg-gray-100">
      {cargando && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e5da8]" />
          <p className="text-sm">Cargando documento...</p>
        </div>
      )}
      <div id={contenedorId.current} className="h-full w-full" />
    </div>
  );
}
