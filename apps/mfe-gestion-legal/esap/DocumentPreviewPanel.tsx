/**
 * PANEL DE PREVISUALIZACIÓN DE DOCUMENTOS
 * Panel lateral estilo Google Drive para previsualizar y gestionar documentos
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  Download,
  Star,
  CheckCircle,
  Share2,
  Trash2,
  FileText,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  File,
  User,
  GraduationCap,
  Award,
  Archive
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';

interface DocumentoUsuario {
  id: string;
  nombre: string;
  tipo: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  categoria: 'personal' | 'academico' | 'laboral' | 'certificados' | 'otros';
  tamaño: number;
  fechaSubida: string;
  estado: 'completo' | 'pendiente' | 'vencido';
  subidoPor: string;
  favorito: boolean;
}

interface DocumentPreviewPanelProps {
  documento: DocumentoUsuario;
  onClose: () => void;
  onDownload: () => void;
  onValidate: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const CATEGORIES = [
  { id: 'personal', name: 'Personal', icon: User, color: '#3B82F6', bgColor: '#EFF6FF' },
  { id: 'academico', name: 'Académico', icon: GraduationCap, color: '#10B981', bgColor: '#ECFDF5' },
  { id: 'certificados', name: 'Certificados', icon: Award, color: '#8B5CF6', bgColor: '#F5F3FF' },
  { id: 'laboral', name: 'Laboral', icon: FileText, color: '#F59E0B', bgColor: '#FFFBEB' },
  { id: 'otros', name: 'Otros', icon: Archive, color: '#6B7280', bgColor: '#F9FAFB' }
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'jpg':
    case 'png': return ImageIcon;
    case 'docx': return FileText;
    case 'xlsx': return FileText;
    default: return File;
  }
};

const getFileColor = (type: string) => {
  switch (type) {
    case 'pdf': return '#EF4444';
    case 'jpg':
    case 'png': return '#8B5CF6';
    case 'docx': return '#3B82F6';
    case 'xlsx': return '#10B981';
    default: return '#6B7280';
  }
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFecha = (isoDate: string) => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function DocumentPreviewPanel({
  documento,
  onClose,
  onDownload,
  onValidate,
  onToggleFavorite,
  onShare,
  onDelete
}: DocumentPreviewPanelProps) {
  const FileIcon = getFileIcon(documento.tipo);
  const fileColor = getFileColor(documento.tipo);
  const category = CATEGORIES.find(c => c.id === documento.categoria);

  // Renderizar preview según tipo de archivo
  const renderDocumentPreview = () => {
    switch (documento.tipo) {
      case 'pdf':
        // Simulación de PDF
        return (
          <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
            {/* Header del PDF */}
            <div className="bg-red-600 h-8 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-xs text-white font-medium">{documento.nombre}</span>
              </div>
              <span className="text-xs text-white opacity-75">Página 1 de 1</span>
            </div>
            
            {/* Contenido del PDF simulado */}
            <div className="p-6 space-y-3 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <div className="h-3 bg-gray-800 rounded w-32 mb-2"></div>
                  <div className="h-2 bg-gray-400 rounded w-24"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-3/4"></div>
              </div>
              
              <div className="pt-3 space-y-2">
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-4/5"></div>
              </div>

              {/* Marca de agua */}
              <div className="flex items-center justify-center py-4 opacity-20">
                <FileText className="w-24 h-24 text-gray-400" />
              </div>
            </div>
          </div>
        );

      case 'jpg':
      case 'png':
        // Simulación de imagen
        return (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 rounded-lg overflow-hidden relative">
            {/* Marco de imagen */}
            <div className="absolute inset-4 bg-white rounded shadow-lg overflow-hidden">
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-purple-200 rounded w-24 mx-auto"></div>
                    <div className="h-2 bg-blue-200 rounded w-32 mx-auto"></div>
                  </div>
                  {/* Simulación de foto de documento */}
                  <div className="mt-6 space-y-2 opacity-50">
                    <div className="h-1.5 bg-gray-400 rounded w-28 mx-auto"></div>
                    <div className="h-1.5 bg-gray-400 rounded w-32 mx-auto"></div>
                    <div className="h-1.5 bg-gray-400 rounded w-24 mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Badge de tipo de imagen */}
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
              <span className="text-xs font-medium text-purple-700">{documento.tipo.toUpperCase()}</span>
            </div>
          </div>
        );

      case 'docx':
        // Simulación de Word
        return (
          <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
            {/* Header de Word */}
            <div className="bg-blue-600 h-8 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-xs text-white font-medium">{documento.nombre}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Contenido de Word simulado */}
            <div className="p-6 space-y-4 bg-white">
              {/* Título del documento */}
              <div>
                <div className="h-4 bg-blue-900 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-400 rounded w-1/2"></div>
              </div>
              
              {/* Párrafos */}
              <div className="space-y-2 pt-2">
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
              </div>
              
              <div className="space-y-2">
                <div className="h-3 bg-blue-700 rounded w-1/3"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                <div className="h-2 bg-gray-300 rounded w-full"></div>
                <div className="h-2 bg-gray-300 rounded w-3/4"></div>
              </div>

              {/* Lista */}
              <div className="space-y-1.5 pl-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <div className="h-2 bg-gray-300 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <div className="h-2 bg-gray-300 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <div className="h-2 bg-gray-300 rounded flex-1"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'xlsx':
        // Simulación de Excel
        return (
          <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
            {/* Header de Excel */}
            <div className="bg-[#1e5da8] h-8 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-xs text-white font-medium">{documento.nombre}</span>
              </div>
              <span className="text-xs text-white opacity-75">Hoja1</span>
            </div>
            
            {/* Tabla de Excel simulada */}
            <div className="bg-white">
              {/* Encabezados de columnas */}
              <div className="grid grid-cols-4 border-b border-gray-300">
                <div className="bg-gray-100 border-r border-gray-300 px-2 py-1">
                  <div className="h-2 bg-gray-400 rounded w-8"></div>
                </div>
                <div className="bg-gray-100 border-r border-gray-300 px-2 py-1">
                  <div className="h-2 bg-gray-400 rounded w-10"></div>
                </div>
                <div className="bg-gray-100 border-r border-gray-300 px-2 py-1">
                  <div className="h-2 bg-gray-400 rounded w-12"></div>
                </div>
                <div className="bg-gray-100 px-2 py-1">
                  <div className="h-2 bg-gray-400 rounded w-10"></div>
                </div>
              </div>
              
              {/* Filas de datos */}
              {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="grid grid-cols-4 border-b border-gray-200">
                  <div className="border-r border-gray-200 px-2 py-1.5">
                    <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                  </div>
                  <div className="border-r border-gray-200 px-2 py-1.5">
                    <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
                  </div>
                  <div className="border-r border-gray-200 px-2 py-1.5">
                    <div className="h-1.5 bg-gray-300 rounded w-2/3"></div>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="h-1.5 bg-blue-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        // Vista genérica para otros tipos
        return (
          <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <FileIcon className="w-20 h-20 mx-auto mb-3" style={{ color: fileColor }} />
              <p className="text-sm text-gray-600">Vista previa no disponible</p>
              <p className="text-xs text-gray-500 mt-1">Descarga el archivo para verlo</p>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Vista Previa</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Cerrar panel"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Preview GRANDE del documento */}
      <div className="mx-4 mt-4 rounded-lg h-80 relative shadow-lg">
        {renderDocumentPreview()}
        
        {/* Badge de favorito flotante */}
        {documento.favorito && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        )}

        {/* Badge de estado flotante */}
        <div className="absolute bottom-3 left-3">
          {documento.estado === 'completo' && (
            <Badge className="bg-[#1e5da8] text-white border-none shadow-lg">
              <CheckCircle className="w-4 h-4 mr-1" />
              Validado
            </Badge>
          )}
          {documento.estado === 'pendiente' && (
            <Badge className="bg-yellow-500 text-white border-none shadow-lg">
              <Clock className="w-4 h-4 mr-1" />
              Pendiente Validación
            </Badge>
          )}
          {documento.estado === 'vencido' && (
            <Badge className="bg-red-600 text-white border-none shadow-lg">
              <AlertCircle className="w-4 h-4 mr-1" />
              Vencido
            </Badge>
          )}
        </div>
      </div>

      {/* Información del documento */}
      <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {/* Nombre */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Nombre</p>
          <p className="font-semibold text-gray-900 break-words">{documento.nombre}</p>
        </div>

        {/* Categoría */}
        {category && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Categoría</p>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  background: category.bgColor,
                  color: category.color 
                }}
              >
                {React.createElement(category.icon, { className: 'w-4 h-4' })}
              </div>
              <span className="text-gray-900">{category.name}</span>
            </div>
          </div>
        )}

        {/* Tamaño */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Tamaño</p>
          <p className="text-gray-900">{formatSize(documento.tamaño)}</p>
        </div>

        {/* Subido por */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Subido por</p>
          <p className="text-gray-900">{documento.subidoPor}</p>
        </div>

        {/* Fecha */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Fecha de subida</p>
          <p className="text-gray-900">{formatFecha(documento.fechaSubida)}</p>
        </div>
      </div>

      {/* Acciones principales */}
      <div className="px-4 py-4 border-t border-gray-200 space-y-2">
        {/* Validar (solo si no está validado) */}
        {documento.estado !== 'completo' && (
          <button
            onClick={onValidate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1e5da8] text-white rounded-lg hover:bg-[#1557a0] transition-colors font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Validar Documento</span>
          </button>
        )}

        {/* Descargar */}
        <button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[--esap-primary] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Download className="w-5 h-5" />
          <span>Descargar</span>
        </button>

        {/* Fila de acciones secundarias */}
        <div className="grid grid-cols-3 gap-2">
          {/* Favorito */}
          <button
            onClick={onToggleFavorite}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              documento.favorito
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Star className={`w-5 h-5 ${documento.favorito ? 'fill-yellow-400' : ''}`} />
            <span className="text-xs">{documento.favorito ? 'Favorito' : 'Marcar'}</span>
          </button>

          {/* Compartir */}
          <button
            onClick={onShare}
            className="flex flex-col items-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs">Compartir</span>
          </button>

          {/* Eliminar */}
          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs">Eliminar</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}