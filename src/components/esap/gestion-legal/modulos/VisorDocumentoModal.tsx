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
  X, FileText, Eye, AlertCircle, ZoomIn, ZoomOut, Download
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { isViewableInBrowser, getFileTypeCategory } from '../../../../utils/fileUtils';

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
      const isMock = !archivo.startsWith('http') && !archivo.startsWith('blob:') && !archivo.startsWith('data:');
      // Si es un archivo mock, no necesitamos esperar 'load' event del iframe/img
      setIsLoading(!isMock);
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

              // MODO SIMULADO: Si es un PDF mock (sin URL real), mostramos un documento HTML simulado
              // Esto evita que se cargue la app recursivamente en el iframe (error "mini ventana web")
              const isMockFile = !archivo.startsWith('http') && !archivo.startsWith('blob:') && !archivo.startsWith('data:');

              if (isMockFile && isPdf) {
                return (
                  <div
                    className="w-full h-full overflow-auto flex justify-center p-8 bg-gray-200"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center'
                    }}
                  >
                    <div className="bg-white shadow-2xl p-12 w-[800px] min-h-[1100px] relative text-gray-800">
                      {/* Membrete Simulado */}
                      <div className="text-center border-b-2 border-gray-300 pb-6 mb-8">
                        <h4 className="font-serif text-lg font-bold text-gray-600 mb-1">REPÚBLICA DE COLOMBIA</h4>
                        <h2 className="font-serif text-2xl font-black text-blue-900 mb-2">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h2>
                        <h5 className="font-serif text-md font-bold text-gray-500">OFICINA ASESORA JURÍDICA</h5>
                        <div className="mt-4 text-sm text-gray-500 font-mono">
                          <strong>Radicado No.</strong> {numero || '2025-400-001234-2'}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          <strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}
                        </div>
                      </div>

                      {/* Cuerpo del Documento Simulado */}
                      <div className="space-y-6 font-serif leading-relaxed text-justify">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <p className="font-bold">Señor(a):</p>
                            <p className="uppercase">Juez Administrativo del Circuito</p>
                            <p>E. S. D.</p>
                          </div>
                        </div>

                        <p className="font-bold uppercase mb-4 text-center text-lg decoration-slice underline">
                          ASUNTO: {asunto || 'DOCUMENTO OFICIAL DEL PROCESO'}
                        </p>

                        <p>
                          Respetado Juez,
                        </p>

                        <p>
                          Por medio del presente escrito, actuando en nombre y representación de la
                          <strong> ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</strong>,
                          me permito allegar el presente documento correspondiente al proceso de la referencia.
                        </p>

                        <p>
                          Este documento constituye una representación visual del archivo <strong>"{archivo}"</strong>
                          que se encuentra almacenado en el sistema de gestión documental.
                          En un entorno de producción, aquí se visualizaría el contenido real del archivo PDF cargado.
                        </p>

                        <p>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
                          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                          ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
                          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>

                        <div className="py-8"></div>

                        <p>
                          Atentamente,
                        </p>

                        <div className="mt-12 pt-4 border-t w-64 border-black">
                          <p className="font-bold">OFICINA JURÍDICA</p>
                          <p className="text-sm">Escuela Superior de Administración Pública</p>
                          <p className="text-xs text-gray-500 mt-1">Firmado electrónicamente</p>
                        </div>
                      </div>

                      {/* Marca de agua */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                        <div className="transform -rotate-45 text-9xl font-black text-gray-900 border-8 border-gray-900 p-4 rounded-xl">
                          ESAP
                        </div>
                      </div>

                      {/* Footer de página */}
                      <div className="absolute bottom-12 left-12 right-12 text-center text-xs text-gray-400 border-t pt-2">
                        <p>Calle 44 No. 53-37 CAN Bogotá D.C. - Código Postal: 111321</p>
                        <p>Documento generado por Plataforma Gestión Legal ESAP</p>
                      </div>
                    </div>
                  </div>
                );
              }

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
                // Non-viewable file type (Word, Excel, etc.)
                const fileCategory = getFileTypeCategory(archivo);
                return (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-10 bg-white rounded-lg shadow-md max-w-md">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 mb-2">Vista previa no disponible</h3>
                      <p className="text-gray-500 mb-4">
                        Los archivos de tipo <strong>{fileCategory}</strong> no se pueden visualizar directamente en el navegador.
                      </p>
                      <a
                        href={archivo}
                        download
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        Descargar Archivo
                      </a>
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
