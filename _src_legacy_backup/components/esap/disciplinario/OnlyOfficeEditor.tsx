import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { buildApiUrl, ONLYOFFICE_URL } from '../../../config/environment';

interface OnlyOfficeEditorProps {
  autoId: string;
  onClose: () => void;
  onSaved?: () => void;
}

declare global {
  interface Window {
    DocsAPI: any;
  }
}

export const OnlyOfficeEditor: React.FC<OnlyOfficeEditorProps> = ({ autoId, onClose, onSaved }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Cargar el script de OnlyOffice API
    const script = document.createElement('script');
    script.src = `${ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    scriptRef.current = script;

    script.onload = async () => {
      try {
        // Obtener configuración desde el backend
        const token = localStorage.getItem('esap_access_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // La ruta del backend es directa sin prefijos /api/v1/
        // Backend: GET /disciplinary-autos/:id/onlyoffice-config
        const configUrl = buildApiUrl('control-disciplinario', `/disciplinary-autos/${autoId}/onlyoffice-config`);

        const response = await fetch(configUrl, {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener la configuración del editor');
        }

        const response_data = await response.json();
        // El backend retorna { success: true, data: {...} }
        const config = response_data.data || response_data;

        console.log('📄 OnlyOffice config recibida:', config);
        console.log('📄 Document URL:', config.document?.url);
        console.log('📄 Document Key:', config.document?.key);

        // Inicializar el editor de OnlyOffice
        // DocEditor requiere el ID del elemento como string, no el elemento DOM
        if (window.DocsAPI) {
          console.log('🚀 Inicializando OnlyOffice DocEditor con ID: onlyoffice-editor');
          new window.DocsAPI.DocEditor('onlyoffice-editor', {
            ...config,
            events: {
              onDocumentReady: () => {
                console.log('✅ Documento cargado y listo para editar');
                toast.success('Editor cargado correctamente');
              },
              onError: (event: any) => {
                console.error('❌ Error en OnlyOffice:', event);
                toast.error('Error al cargar el editor: ' + (event?.data?.message || 'Error desconocido'));
              },
              onAppReady: () => {
                console.log('✅ OnlyOffice App lista');
              },
            },
          });
        } else {
          console.error('❌ DocsAPI no disponible', { docsAPI: !!window.DocsAPI });
        }
      } catch (error) {
        console.error('Error inicializando OnlyOffice:', error);
        toast.error('Error al inicializar el editor de documentos');
      }
    };

    script.onerror = () => {
      toast.error('No se pudo conectar con el servidor de OnlyOffice');
      console.error('Error cargando OnlyOffice script');
    };

    document.body.appendChild(script);

    // Cleanup al desmontar
    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
    };
  }, [autoId]);

  return (
    <div
      className="fixed z-40 bg-white"
      style={{
        top: '84px',
        left: '260px',
        right: '0',
        bottom: '0',
      }}
    >
      {/* Botón flotante de cierre */}
      <button
        onClick={onClose}
        className="absolute top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
        title="Cerrar editor"
      >
        <X className="w-4 h-4" />
        Cerrar
      </button>

      {/* Editor Container - ocupa todo el espacio */}
      <div id="onlyoffice-editor" className="w-full h-full" />
    </div>
  );
};
