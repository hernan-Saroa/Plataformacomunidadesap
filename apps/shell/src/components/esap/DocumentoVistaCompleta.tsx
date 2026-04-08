/**
 * VISTA COMPLETA DE DOCUMENTO - MODAL PARA APROBACIÓN
 * Permite visualizar documentos en pantalla completa para revisión y aprobación
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Download, 
  CheckCircle, 
  XCircle, 
  Star,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  FileText
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface DocumentoVistaCompletaProps {
  documento: {
    id: string;
    nombre: string;
    tipo: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
    categoria: string;
    tamaño: number;
    fechaSubida: string;
    estado: 'completo' | 'pendiente' | 'vencido';
    subidoPor: string;
    favorito: boolean;
  };
  onClose: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onDownload: () => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatFecha = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function DocumentoVistaCompleta({ 
  documento, 
  onClose, 
  onAprobar, 
  onRechazar,
  onDownload 
}: DocumentoVistaCompletaProps) {
  const [zoom, setZoom] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const renderDocumentPreview = () => {
    // Simulación de vista previa del documento
    if (documento.tipo === 'pdf') {
      return (
        <div className="w-full h-full bg-white rounded-lg shadow-inner p-8 overflow-auto">
          <div 
            className="mx-auto bg-white shadow-lg"
            style={{ 
              width: `${zoom}%`,
              transform: `rotate(${rotation}deg)`,
              transition: 'all 0.3s ease'
            }}
          >
            {/* Simulación de contenido PDF */}
            <div className="p-8 border border-gray-200">
              <div className="mb-6">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
              </div>

              <div className="mb-6">
                <div className="h-4 bg-gray-300 rounded w-2/3 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="h-32 bg-gray-100 rounded"></div>
                <div className="h-32 bg-gray-100 rounded"></div>
              </div>

              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (documento.tipo === 'jpg' || documento.tipo === 'png') {
      return (
        <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center overflow-auto">
          <div 
            className="bg-white p-4 rounded shadow-lg"
            style={{ 
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'all 0.3s ease'
            }}
          >
            {/* Simulación de imagen */}
            <div className="w-96 h-96 bg-gradient-to-br from-blue-100 to-blue-300 rounded flex items-center justify-center">
              <FileText className="w-24 h-24 text-blue-600 opacity-50" />
            </div>
          </div>
        </div>
      );
    }

    // Para DOCX, XLSX, etc.
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-inner p-8 overflow-auto">
        <div 
          className="mx-auto bg-white shadow-lg"
          style={{ 
            width: `${zoom}%`,
            transform: `rotate(${rotation}deg)`,
            transition: 'all 0.3s ease'
          }}
        >
          <div className="p-8 border border-gray-200">
            <div className="mb-6">
              <div className="h-6 bg-blue-600 text-white rounded px-4 py-1 inline-block mb-4">
                Documento Office
              </div>
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
            </div>
            
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-[--esap-primary] text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="font-semibold text-lg">{documento.nombre}</h2>
              <div className="flex items-center gap-3 text-sm opacity-90 mt-1">
                <span>{formatSize(documento.tamaño)}</span>
                <span>•</span>
                <span>{formatFecha(documento.fechaSubida)}</span>
                <span>•</span>
                <span>Subido por {documento.subidoPor}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {documento.estado === 'completo' && (
              <Badge className="bg-[#1e5da8] text-white border-[#1e5da8]">
                Validado
              </Badge>
            )}
            {documento.estado === 'pendiente' && (
              <Badge className="bg-yellow-500 text-white border-yellow-600">
                Pendiente
              </Badge>
            )}
            {documento.estado === 'vencido' && (
              <Badge className="bg-red-500 text-white border-red-600">
                Vencido
              </Badge>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rotar"
            >
              <RotateCw className="w-5 h-5 text-gray-700" />
            </button>
            
            <button
              onClick={() => {
                onDownload();
                toast.success('Descargando documento...');
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Descargar"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>
            
            <button
              onClick={() => toast.info('Función de impresión próximamente')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="w-5 h-5 text-gray-700" />
            </button>
            
            <button
              onClick={() => toast.success('Enlace compartido copiado')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Compartir"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {documento.estado !== 'completo' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onRechazar();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <XCircle className="w-4 h-4" />
                <span>Rechazar</span>
              </button>
              <button
                onClick={() => {
                  onAprobar();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#1557a0] transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Aprobar Documento</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenido del documento */}
        <div className="flex-1 overflow-hidden p-6">
          {renderDocumentPreview()}
        </div>

        {/* Footer con información adicional */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Categoría: <span className="font-medium text-gray-900">{documento.categoria}</span></span>
              <span>•</span>
              <span>Tipo: <span className="font-medium text-gray-900">{documento.tipo.toUpperCase()}</span></span>
            </div>
            <div className="text-xs text-gray-500">
              Presiona ESC para cerrar
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}