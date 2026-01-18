/**
 * VisorDocumentoModal - Visor de Documentos PDF con Funcionalidad Real
 * ✅ Visualización completa de documentos
 * ✅ Sin botones de descarga/impresión (solo visor)
 * ✅ Diseño corporativo ESAP 2025
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import {
  X, FileText, Eye, AlertCircle, ZoomIn, ZoomOut
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

interface VisorDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivo?: string;
  numero?: string;
  asunto?: string;
}

export function VisorDocumentoModal({
  isOpen,
  onClose,
  archivo,
  numero,
  asunto
}: VisorDocumentoModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset loading state when archivo changes
  useEffect(() => {
    if (archivo) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [archivo]);

  if (!archivo || !numero) {
    return null;
  }

  /**
   * Zoom controls
   */
  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(prev => prev + 25);
      toast.success(`Zoom: ${zoomLevel + 25}%`, { duration: 1000 });
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(prev => prev - 25);
      toast.success(`Zoom: ${zoomLevel - 25}%`, { duration: 1000 });
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="!max-w-[90vw] !w-[90vw] !h-[90vh] overflow-hidden flex flex-col p-0"
        style={{ zIndex: 9999 }}
      >
        <DialogTitle className="sr-only">Visor de Documento - {numero}</DialogTitle>
        <DialogDescription className="sr-only">
          Visualización del documento {archivo}
        </DialogDescription>

        {/* ==================== HEADER ==================== */}
        <div
          className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b"
          style={{ background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-base truncate max-w-[400px]">{numero}</h3>
              <p className="text-xs text-blue-100">{asunto || 'Documento'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ==================== SIMPLE TOOLBAR (ONLY ZOOM) ==================== */}
        <div className="flex-shrink-0 px-6 py-2 bg-gray-50 border-b flex items-center justify-between">
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="font-bold"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold text-gray-700 px-3 min-w-[60px] text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="font-bold"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye className="w-4 h-4" />
            <span>Vista previa del documento</span>
          </div>
        </div>

        {/* ==================== DOCUMENT VIEWER AREA ==================== */}
        <div className="flex-1 overflow-hidden bg-gray-200 relative">
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Cargando documento...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center p-10">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">Error al cargar documento</h3>
                <p className="text-gray-500">No se pudo cargar la vista previa del documento.</p>
              </div>
            </div>
          )}

          {/* PDF/Image viewer */}
          {archivo && (
            (() => {
              const extension = archivo.split('.').pop()?.toLowerCase();
              const isPdf = extension === 'pdf' || archivo.includes('pdf') || archivo.includes('.pdf');
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '') || archivo.match(/\.(jpg|jpeg|png|gif|webp)/i);

              if (isPdf) {
                return (
                  <div
                    className="w-full h-full overflow-auto flex items-start justify-center p-4"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center'
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={`${archivo}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full bg-white shadow-lg border-0"
                      style={{
                        minHeight: '100%',
                        height: 'calc(95vh - 150px)'
                      }}
                      title="Visor PDF"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                    />
                  </div>
                );
              } else if (isImage) {
                return (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    <img
                      src={archivo}
                      alt={numero || 'Documento'}
                      className="max-w-full max-h-full object-contain shadow-lg"
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: 'center center'
                      }}
                      onLoad={() => setIsLoading(false)}
                      onError={() => { setIsLoading(false); setHasError(true); }}
                    />
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-10 bg-white rounded-lg shadow-md">
                      <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 mb-2">Vista previa no disponible</h3>
                      <p className="text-gray-500">
                        Este tipo de archivo no se puede visualizar directamente.
                      </p>
                    </div>
                  </div>
                );
              }
            })()
          )}
        </div>

        {/* ==================== FOOTER ==================== */}
        <div className="flex-shrink-0 px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600 truncate max-w-[400px]">
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold truncate">{numero}</span>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="font-bold"
          >
            <X className="w-4 h-4 mr-1" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
