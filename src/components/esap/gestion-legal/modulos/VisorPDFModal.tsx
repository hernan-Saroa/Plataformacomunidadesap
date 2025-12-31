/**
 * VisorPDFModal - Modal Corporativo Premium para Visualizar Documentos PDF
 * Componente con diseño ESAP corporativo profesional
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { 
  X, Download, Printer, ZoomIn, ZoomOut, Maximize2, FileText, 
  Eye, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Badge } from '../../../ui/badge';

interface VisorPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: {
    numero: string;
    tipo: string;
    archivo: string;
    fecha: string;
    juzgado: string;
    resumen: string;
    tamaño: string;
  };
  expedienteId: string;
}

export function VisorPDFModal({ isOpen, onClose, documento, expedienteId }: VisorPDFModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3; // Simulado

  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(prev => prev + 10);
      toast.success(`Zoom: ${zoomLevel + 10}%`, { duration: 1000 });
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(prev => prev - 10);
      toast.success(`Zoom: ${zoomLevel - 10}%`, { duration: 1000 });
    }
  };

  const handlePrint = () => {
    toast.loading('🖨️ Preparando impresión...', { 
      id: 'print-doc',
      duration: 1500 
    });
    
    setTimeout(() => {
      toast.success('✅ Documento enviado a impresión', {
        id: 'print-doc',
        description: `${documento.numero} - ${documento.tipo}`,
        duration: 3000
      });
      
      // En producción: window.print() o abrir ventana de impresión
      console.log('📊 Documento enviado a impresión:', {
        numero: documento.numero,
        tipo: documento.tipo,
        expediente: expedienteId,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  };

  const handleDownload = () => {
    toast.loading('⏳ Descargando documento...', { 
      id: 'download-viewer',
      duration: 1000 
    });
    
    setTimeout(() => {
      // Generar contenido HTML del documento
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${documento.numero}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; border-bottom: 3px solid #003DA5; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #003DA5; }
            .subtitle { color: #666; font-size: 12px; }
            .auto-numero { font-size: 20px; font-weight: bold; color: #F57C00; margin: 20px 0; }
            .metadata { background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #F57C00; }
            .metadata-item { margin: 8px 0; }
            .label { font-weight: bold; color: #333; }
            .content { line-height: 1.6; text-align: justify; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</div>
            <div class="subtitle">ESAP - República de Colombia</div>
            <div class="subtitle">Oficina Jurídica - Gestión Legal</div>
          </div>
          
          <div class="auto-numero">AUTO PROCESAL ${documento.numero}</div>
          
          <div class="metadata">
            <div class="metadata-item"><span class="label">Tipo:</span> ${documento.tipo}</div>
            <div class="metadata-item"><span class="label">Expediente:</span> ${expedienteId}</div>
            <div class="metadata-item"><span class="label">Juzgado:</span> ${documento.juzgado}</div>
            <div class="metadata-item"><span class="label">Fecha de emisión:</span> ${documento.fecha}</div>
          </div>
          
          <div class="content">
            <p><strong>RESUMEN DEL AUTO:</strong></p>
            <p>${documento.resumen}</p>
            
            <p style="margin-top: 30px;"><strong>CONTENIDO COMPLETO:</strong></p>
            <p>
              El presente auto procesal fue emitido por ${documento.juzgado} en el marco del proceso judicial 
              con radicado ${expedienteId}. Este documento establece las determinaciones del juzgado 
              respecto a ${documento.tipo.toLowerCase()}.
            </p>
            
            <p>
              En cumplimiento de las disposiciones procesales vigentes y conforme a las normas aplicables, 
              se ordena dar cumplimiento a lo establecido en el presente auto en los términos y condiciones 
              señalados. La parte demandada (ESAP) deberá atender los requerimientos aquí contenidos 
              dentro de los plazos procesales correspondientes.
            </p>
          </div>
          
          <div class="footer">
            <p>Documento descargado desde el Visor de Documentos - Sistema de Gestión Legal ESAP</p>
            <p>Fecha de descarga: ${new Date().toLocaleDateString('es-CO', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="margin-top: 10px; font-size: 10px;">
              Este es un documento simulado para demostración del sistema.<br>
              En producción, aquí se descargaría el documento oficial escaneado.
            </p>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documento.numero}_${documento.tipo.replace(/\s+/g, '_')}.html`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('✅ Descarga completada desde el visor', {
        id: 'download-viewer',
        description: `${documento.archivo} descargado exitosamente`,
        duration: 3000
      });
    }, 1000);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      toast.info(`Página ${currentPage - 1} de ${totalPages}`, { duration: 1000 });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      toast.info(`Página ${currentPage + 1} de ${totalPages}`, { duration: 1000 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] p-0 overflow-hidden flex flex-col">
        <DialogDescription className="sr-only">
          Visor de documento {documento.numero}
        </DialogDescription>
        
        {/* Header Limpio y Usable - ESAP */}
        <ModalHeaderClean
          titulo={documento.numero}
          subtitulo={`${documento.tipo} • ${documento.archivo} (${documento.tamaño})`}
          icono={FileText}
          colorIcono="blue"
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                <Eye className="w-3 h-3 mr-1" />
                Página {currentPage} de {totalPages}
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-gray-300 text-gray-700">
                Zoom: {zoomLevel}%
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Barra de herramientas */}
        <div className="flex-shrink-0 bg-gray-50 border-b px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Controles de navegación */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                size="sm"
                variant="outline"
                className="disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              
              <div className="px-3 py-1.5 bg-white border rounded-lg">
                <span className="text-xs font-bold text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
              </div>

              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                size="sm"
                variant="outline"
                className="disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Controles de zoom y acciones */}
            <div className="flex items-center gap-2">
              {/* Zoom */}
              <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                <Button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  size="sm"
                  variant="ghost"
                  className="disabled:opacity-30 p-1 h-auto"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                
                <span className="text-xs font-bold text-gray-700 px-2 min-w-[50px] text-center">
                  {zoomLevel}%
                </span>

                <Button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                  size="sm"
                  variant="ghost"
                  className="disabled:opacity-30 p-1 h-auto"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Acciones */}
              <Button
                onClick={handleDownload}
                size="sm"
                variant="outline"
                className="font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar
              </Button>

              <Button
                onClick={handlePrint}
                size="sm"
                variant="outline"
                className="font-semibold"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>

        {/* Visor de Documento - Área principal */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div 
            className="max-w-4xl mx-auto bg-white shadow-2xl rounded-lg border-4 border-gray-200"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease'
            }}
          >
            {/* Contenido del documento simulado */}
            <div className="p-12">
              {/* Header del documento */}
              <div className="text-center border-b-4 border-[#003DA5] pb-6 mb-8">
                <h1 className="text-2xl font-black text-[#003DA5] mb-2">
                  ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                </h1>
                <p className="text-sm text-gray-600 mb-1">ESAP - República de Colombia</p>
                <p className="text-xs text-gray-500">Oficina Jurídica - Gestión Legal</p>
              </div>

              {/* Número del auto */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-black text-[#F57C00] mb-2">
                  AUTO PROCESAL {documento.numero}
                </h2>
                <p className="text-sm text-gray-600">{documento.tipo}</p>
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 border-l-4 border-[#F57C00] p-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-bold text-gray-700">Expediente:</span>
                    <span className="ml-2 text-gray-900">{expedienteId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">Juzgado:</span>
                    <span className="ml-2 text-gray-900">{documento.juzgado}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">Fecha de emisión:</span>
                    <span className="ml-2 text-gray-900">{documento.fecha}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">Página:</span>
                    <span className="ml-2 text-gray-900">{currentPage} de {totalPages}</span>
                  </div>
                </div>
              </div>

              {/* Contenido del documento */}
              <div className="space-y-4 text-sm text-gray-800 leading-relaxed text-justify">
                <div className="mb-4">
                  <h3 className="font-black text-gray-900 mb-2">RESUMEN DEL AUTO:</h3>
                  <p>{documento.resumen}</p>
                </div>

                <div className="mb-4">
                  <h3 className="font-black text-gray-900 mb-2">CONSIDERACIONES:</h3>
                  <p>
                    El presente auto procesal fue emitido por {documento.juzgado} en el marco del 
                    proceso judicial con radicado {expedienteId}. Este documento establece las 
                    determinaciones del juzgado respecto a {documento.tipo.toLowerCase()}.
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="font-black text-gray-900 mb-2">PARTE RESOLUTIVA:</h3>
                  <p>
                    En cumplimiento de las disposiciones procesales vigentes y conforme a las normas 
                    aplicables contenidas en el Código General del Proceso y las leyes especiales, 
                    se ordena dar cumplimiento a lo establecido en el presente auto en los términos 
                    y condiciones señalados.
                  </p>
                  <p className="mt-3">
                    La parte demandada (Escuela Superior de Administración Pública - ESAP) deberá 
                    atender los requerimientos aquí contenidos dentro de los plazos procesales 
                    correspondientes, so pena de las sanciones procesales a que haya lugar.
                  </p>
                </div>

                {/* Contenido condicional por página */}
                {currentPage === 2 && (
                  <div className="mb-4">
                    <h3 className="font-black text-gray-900 mb-2">NOTIFICACIONES:</h3>
                    <p>
                      Notifíquese el presente auto a las partes procesales conforme a lo establecido 
                      en los artículos correspondientes del Código General del Proceso. Una vez ejecutoriado, 
                      procédase conforme a derecho.
                    </p>
                  </div>
                )}

                {currentPage === 3 && (
                  <div className="mb-4">
                    <h3 className="font-black text-gray-900 mb-2">FIRMAS Y CONSTANCIAS:</h3>
                    <div className="mt-8 pt-8 border-t-2 border-gray-300">
                      <p className="text-center font-bold mb-4">
                        _________________________________
                      </p>
                      <p className="text-center text-xs">
                        JUZGADO ADMINISTRATIVO<br/>
                        {documento.juzgado}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer del documento */}
              <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center">
                <p className="text-xs text-gray-500">
                  Documento visualizado desde el Sistema de Gestión Legal ESAP
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Fecha de visualización: {new Date().toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-2 italic">
                  Este es un documento simulado para demostración del sistema.<br/>
                  En producción, aquí se visualizaría el documento oficial escaneado en formato PDF.
                </p>
              </div>
            </div>
          </div>

          {/* Indicador de página actual (simulado) */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border-2 border-gray-200">
              <Eye className="w-4 h-4 text-[#003DA5]" />
              <span className="text-xs font-bold text-gray-700">
                Visualizando: {documento.numero} - Página {currentPage} de {totalPages}
              </span>
            </div>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span>
                Usa los controles de zoom y navegación para explorar el documento completo
              </span>
            </div>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cerrar Visor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}