/**
 * Vista del informe preliminar en Word y confirmación antes de notificar (EFDS-2455).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, Send, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';

/** Descarga un archivo generado en el navegador. */
export function descargarArchivo(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** El Word generado, pintado dentro del sistema con docx-preview, y su descarga. */
export const ModalVistaInformeWord: React.FC<{
  blob: Blob;
  nombreArchivo: string;
  onDescargar: () => void;
  onClose: () => void;
}> = ({ blob, nombreArchivo, onDescargar, onClose }) => {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    let cancelado = false;
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    contenedor.innerHTML = '';
    setEstado('cargando');
    import('docx-preview')
      .then(({ renderAsync }) =>
        renderAsync(blob, contenedor, undefined, {
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          ignoreLastRenderedPageBreak: true,
        }),
      )
      .then(() => !cancelado && setEstado('listo'))
      .catch((e) => {
        console.error('[Informe preliminar] No se pudo mostrar el Word:', e);
        if (!cancelado) setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [blob]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95%] h-[95vh] flex flex-col p-0 overflow-hidden bg-gray-100 border-0 shadow-2xl" size="xl">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 gap-3">
          <DialogHeader className="p-0 border-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900 m-0">
              <Eye className="w-6 h-6 text-blue-700" />
              Vista previa — Informe preliminar (EM-FO-003)
            </DialogTitle>
            <p className="text-sm text-gray-600 m-0">
              Borrador para completar en Word. Lo resaltado en amarillo lo diligencia el auditor. Aún no se ha notificado al área auditada.
            </p>
          </DialogHeader>
          <Button size="sm" className="bg-[#003DA5] hover:bg-[#002D7A] text-white font-medium" onClick={onDescargar} title={nombreArchivo}>
            <Download className="w-4 h-4 mr-1.5" /> Descargar Word (.docx)
          </Button>
        </div>
        <div className="flex-1 overflow-auto relative">
          {estado === 'cargando' && (
            <div className="flex flex-col items-center justify-center gap-4 h-full text-gray-400 bg-gray-50">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin flex-shrink-0" />
              <p className="font-medium text-sm">Preparando la vista previa...</p>
            </div>
          )}
          {estado === 'error' && (
            <div className="flex flex-col items-center justify-center gap-2 h-full text-gray-600 bg-gray-50">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <p className="font-medium text-sm">No se pudo mostrar la vista previa. Descargue el Word para revisarlo.</p>
            </div>
          )}
          <div ref={contenedorRef} className="docx-preview-content w-full" data-testid="vista-informe-preliminar-word" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Confirma que subir el informe notifica al área auditada e inicia el plazo de controversias. */
export const ModalConfirmarNotificacionInforme: React.FC<{
  archivo: File;
  responsable?: string;
  enviando: boolean;
  onConfirmar: () => void;
  onClose: () => void;
}> = ({ archivo, responsable, enviando, onConfirmar, onClose }) => (
  <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
    <DialogContent size="md">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <Send className="w-5 h-5 text-green-600" />
          Notificar el informe preliminar
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <FileText className="w-5 h-5 text-blue-700 flex-shrink-0" />
          <span className="font-medium text-gray-900 break-all">{archivo.name}</span>
        </div>
        <p>Al confirmar:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Se notifica al área auditada{responsable ? ` (${responsable})` : ''} por el portal y por correo, con este archivo adjunto.
          </li>
          <li>Los hallazgos pasan a «Notificado».</li>
          <li>Empiezan a correr los 5 días hábiles para que el área acepte o controvierta cada hallazgo.</li>
        </ul>
        <p className="font-medium text-gray-900">Esta acción no se puede deshacer.</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={onClose} disabled={enviando}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onConfirmar} disabled={enviando} className="font-medium bg-green-600 hover:bg-green-700 text-white">
          <Send className="w-4 h-4 mr-2" />
          {enviando ? 'Notificando...' : 'Notificar al área auditada'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
