/**
 * Vista de un documento del Centro de Ayuda con el OnlyOffice que ya tiene la
 * plataforma (mismo esquema que el visor de Control Interno, EFDS-1080).
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ONLYOFFICE_URL } from '../../../config/environment';
import { centroAyudaService } from '../../../services/api/centroAyuda.service';

let promesaScript: Promise<void> | null = null;

function cargarApiOnlyOffice(): Promise<void> {
  if ((window as any).DocsAPI) return Promise.resolve();
  if (promesaScript) return promesaScript;

  promesaScript = new Promise<void>((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = `${ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    const tiempoLimite = setTimeout(() => {
      promesaScript = null;
      rechazar(new Error('El visor de documentos no respondió'));
    }, 20000);
    script.onload = () => {
      clearTimeout(tiempoLimite);
      resolver();
    };
    script.onerror = () => {
      clearTimeout(tiempoLimite);
      promesaScript = null;
      rechazar(new Error('No se pudo cargar el visor de documentos'));
    };
    document.body.appendChild(script);
  });

  return promesaScript;
}

interface Props {
  recursoId: number;
  onFallo: (motivo: string) => void;
}

export function VisorOnlyOfficeRecurso({ recursoId, onFallo }: Props) {
  const contenedorId = useRef(`visor-centro-ayuda-${Math.random().toString(36).slice(2)}`);
  const editorRef = useRef<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const abrir = async () => {
      try {
        const [config] = await Promise.all([
          centroAyudaService.configOnlyOffice(recursoId),
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
              if (!cancelado) setCargando(false);
            },
            onError: (evento: any) => {
              if (cancelado) return;
              console.warn('[CentroAyuda] error del visor', evento?.data || evento);
              onFallo(evento?.data?.errorDescription || 'El visor no pudo abrir el documento');
            },
          },
        });
      } catch (err) {
        if (cancelado) return;
        console.warn('[CentroAyuda] no se pudo abrir el visor', err);
        onFallo(err instanceof Error ? err.message : 'No se pudo abrir la vista previa');
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
  }, [recursoId]);

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
