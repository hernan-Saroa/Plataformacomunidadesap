import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Share2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Dialog, DialogContent } from '@esap-mfe/shared-ui/dialog';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/browser';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  documentName: string;
  certificadoInfo: {
    consecutivo: string;
    empleado: string;
    fecha: string;
  };
}

export function PDFViewerModal({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  documentName,
  certificadoInfo 
}: PDFViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const totalPages = 1; // Mock - en producción vendría del PDF real

  if (!isOpen) return null;

  const handleZoomIn = () => {
    if (zoom < 200) {
      setZoom(prev => Math.min(prev + 25, 200));
      toast.success('Zoom aumentado', { description: `${zoom + 25}%` });
    }
  };

  const handleZoomOut = () => {
    if (zoom > 50) {
      setZoom(prev => Math.max(prev - 25, 50));
      toast.success('Zoom reducido', { description: `${zoom - 25}%` });
    }
  };

  const handleDownload = () => {
    toast.success('Descarga iniciada', {
      description: documentName,
      duration: 3000
    });
    console.log('Descargar PDF:', pdfUrl);
    // En producción: window.open(pdfUrl, '_blank');
  };

  const handlePrint = () => {
    toast.info('Preparando impresión...', {
      description: 'Abriendo diálogo de impresión'
    });
    // En producción: window.print();
  };

  const handleShare = () => {
    copyToClipboard(pdfUrl);
    toast.success('Enlace copiado', {
      description: 'El enlace del certificado se copió al portapapeles'
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      toast.info('Modo pantalla completa activado');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container - OPTIMIZADO RESPONSIVE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center p-0 md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-6xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="bg-[#1e5da8] px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-white/10 p-2 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-white text-sm md:text-lg truncate">
                        {documentName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-white/20 border-white/30 text-white text-[10px] md:text-xs">
                          {certificadoInfo.consecutivo}
                        </Badge>
                        <p className="text-blue-100 text-xs md:text-sm truncate">
                          {certificadoInfo.empleado}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-white hover:bg-white/10 h-8 w-8 p-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="bg-gray-50 border-b border-gray-200 px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
                <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap">
                  
                  {/* Left Controls - Zoom */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoom <= 50}
                      className="h-8 px-2 md:px-3"
                    >
                      <ZoomOut className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <span className="text-xs md:text-sm text-gray-700 min-w-[50px] md:min-w-[60px] text-center font-medium">
                      {zoom}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoom >= 200}
                      className="h-8 px-2 md:px-3"
                    >
                      <ZoomIn className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>

                  {/* Center Controls - Navigation */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="h-8 px-2 md:px-3"
                    >
                      <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <span className="text-xs md:text-sm text-gray-700 px-2 md:px-3">
                      <span className="font-medium">{currentPage}</span> / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="h-8 px-2 md:px-3"
                    >
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>

                  {/* Right Controls - Actions */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotate}
                      className="h-8 px-2 md:px-3 hidden md:flex"
                      title="Rotar"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="h-8 px-2 md:px-3 hidden md:flex"
                      title="Imprimir"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="h-8 px-2 md:px-3 hidden sm:flex"
                      title="Compartir"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleFullscreen}
                      className="h-8 px-2 md:px-3"
                      title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-3 h-3 md:w-4 md:h-4" />
                      ) : (
                        <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownload}
                      className="bg-[#1e5da8] hover:bg-[#164a87] text-white h-8 px-2 md:px-4 gap-1 md:gap-2"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Descargar</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* PDF Viewer Area */}
              <div className="flex-1 overflow-auto bg-gray-100 p-2 md:p-6">
                <motion.div
                  animate={{ 
                    scale: zoom / 100,
                    rotate: rotation
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  className="mx-auto bg-white shadow-2xl"
                  style={{ 
                    width: '210mm',
                    minHeight: '297mm',
                    transformOrigin: 'center top'
                  }}
                >
                  {/* Mock PDF Content - En producción usar PDF.js o react-pdf */}
                  <div className="p-12 md:p-16 space-y-8">
                    {/* Header del Certificado */}
                    <div className="text-center border-b-2 border-[#1e5da8] pb-6">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-[#1e5da8] rounded-full flex items-center justify-center">
                          <span className="text-white text-2xl">ESAP</span>
                        </div>
                      </div>
                      <h1 className="text-[#1e5da8] text-2xl mb-2">
                        ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                      </h1>
                      <p className="text-gray-600 text-sm">
                        NIT: 899.999.061-4
                      </p>
                    </div>

                    {/* Título */}
                    <div className="text-center py-6">
                      <h2 className="text-xl text-gray-800 mb-2">
                        CERTIFICADO LABORAL
                      </h2>
                      <p className="text-gray-600 text-sm">
                        No. {certificadoInfo.consecutivo}
                      </p>
                    </div>

                    {/* Contenido */}
                    <div className="space-y-4 text-justify text-gray-800 leading-relaxed">
                      <p>
                        El suscrito Director Nacional de Talento Humano de la Escuela Superior de 
                        Administración Pública - ESAP
                      </p>
                      
                      <p className="text-center text-lg py-4">
                        <strong>CERTIFICA QUE:</strong>
                      </p>

                      <p>
                        <strong>{certificadoInfo.empleado.toUpperCase()}</strong>, identificado(a) con 
                        Cédula de Ciudadanía número 52.345.678, labora en esta entidad desde el 15 de 
                        marzo de 2018, desempeñando actualmente el cargo de <strong>Docente Tiempo 
                        Completo</strong> en la <strong>Dirección Territorial Bogotá</strong>.
                      </p>

                      <p>
                        El mencionado funcionario se encuentra vinculado mediante contrato de 
                        <strong> Planta Permanente</strong>, con una asignación salarial mensual de 
                        <strong> CINCO MILLONES SESENTA Y SIETE MIL OCHOCIENTOS NOVENTA PESOS M/CTE 
                        ($5.067.890)</strong>, correspondiente al Grado 14 del escalafón docente.
                      </p>

                      <p>
                        La presente certificación se expide a solicitud del interesado para los fines 
                        que este considere pertinentes, a los {new Date().getDate()} días del mes de {
                          new Date().toLocaleDateString('es-CO', { month: 'long' })
                        } de {new Date().getFullYear()}.
                      </p>
                    </div>

                    {/* Firma */}
                    <div className="pt-16 space-y-8">
                      <div className="text-center">
                        <div className="border-t-2 border-gray-800 w-64 mx-auto mb-2"></div>
                        <p className="font-bold text-gray-800">
                          Dr. Jorge Luis Ramírez Mora
                        </p>
                        <p className="text-gray-600 text-sm">
                          Director Nacional de Talento Humano
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                          Documento firmado electrónicamente
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-12 border-t border-gray-300 text-center text-xs text-gray-500 space-y-1">
                      <p>
                        Carrera 7 No. 6-54 - Bogotá D.C., Colombia
                      </p>
                      <p>
                        PBX: (601) 326 8000 - www.esap.edu.co
                      </p>
                      <p className="pt-2 text-[10px]">
                        Código de verificación: {certificadoInfo.consecutivo} | 
                        Generado: {certificadoInfo.fecha}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Footer Info */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 md:px-6 py-2 md:py-3 flex-shrink-0">
                <div className="flex items-center justify-between text-xs md:text-sm text-gray-600">
                  <span>
                    Generado: {new Date(certificadoInfo.fecha).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="hidden md:inline">
                    Vista previa del certificado laboral
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}