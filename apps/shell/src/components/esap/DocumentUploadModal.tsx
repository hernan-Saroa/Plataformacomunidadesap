/**
 * COMPONENTE: Modal de Subida de Documentos
 * 
 * Modal con drag & drop para subir archivos a la carpeta digital
 * - Soporte para múltiples archivos
 * - Preview de archivos seleccionados
 * - Selección de categoría
 * - Validación de tamaño y tipo
 * - Progress bar durante upload
 * 
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, FileText, Image as ImageIcon, File,
  Trash2, CheckCircle, AlertCircle, Loader2, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseService } from '../../services/api/supabase.service';
import { ModalPortal } from '../ui/ModalPortal';
import { tiposDocumentosService } from '../../services/api/supabase.service';

// ============================================================================
// TYPES
// ============================================================================

type DocumentCategory = string; // Dynamic from tipos de documentos

interface TipoDocConfig {
  id: string;
  nombre: string;
  categoria: string;
  color: string;
  obligatorio: boolean;
  formatos_permitidos: string[];
  tamano_max_mb: number;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  category: string;
  tipoDocumentoId?: string;
  id: string;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  carpetaId: string;
  carpetaNombre: string;
  onUploadSuccess: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Fallback categories if tipos API fails
const FALLBACK_CATEGORIES: Array<{ value: string; label: string; color: string }> = [
  { value: 'personal', label: 'Documentos Personales', color: '#2962FF' },
  { value: 'academico', label: 'Documentos Academicos', color: '#10B981' },
  { value: 'certificados', label: 'Certificados', color: '#8B5CF6' },
  { value: 'laboral', label: 'Documentos Laborales', color: '#F59E0B' },
  { value: 'administrativo', label: 'Administrativo', color: '#EF4444' },
  { value: 'otros', label: 'Otros Documentos', color: '#6B7280' }
];

// ============================================================================
// UTILS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return FileText;
  if (type.includes('image')) return ImageIcon;
  return File;
};

const getFileIconColor = (type: string) => {
  if (type.includes('pdf')) return '#EF4444';
  if (type.includes('image')) return '#8B5CF6';
  return '#6B7280';
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentUploadModal({
  isOpen,
  onClose,
  carpetaId,
  carpetaNombre,
  onUploadSuccess
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocConfig[]>([]);

  // Fetch tipos de documentos on mount
  useEffect(() => {
    const fetchTiposDocumentos = async () => {
      try {
        const result = await tiposDocumentosService.getAll();
        if (result.success && result.data) {
          setTiposDocumentos(result.data.filter((t: any) => t.activo));
        }
      } catch (error: any) {
        console.warn('Error fetching tipos de documentos, using fallback:', error);
      }
    };

    if (isOpen) {
      fetchTiposDocumentos();
    }
  }, [isOpen]);

  // ========== DRAG & DROP HANDLERS ==========
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  // ========== FILE PROCESSING ==========
  const processFiles = (fileList: File[]) => {
    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    fileList.forEach((file) => {
      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        return;
      }

      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: El archivo excede el tamaño máximo de 10MB`);
        return;
      }

      // Crear preview para imágenes
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      validFiles.push({
        file,
        preview,
        category: '' as DocumentCategory, // Sin categoría por defecto - el usuario debe seleccionar
        id: `${Date.now()}-${Math.random()}`
      });
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} archivo(s) agregado(s)`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // ========== FILE MANAGEMENT ==========
  const updateFileCategory = (fileId: string, tipoId: string) => {
    // Find the tipo to get its categoria
    const tipo = tiposDocumentos.find(t => t.id === tipoId);
    const category = tipo ? tipo.categoria : tipoId; // fallback categories use value directly
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, category, tipoDocumentoId: tipo ? tipo.id : undefined } : f
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // ========== UPLOAD ==========
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo');
      return;
    }

    // Validar que todos tengan categoría asignada
    const filesWithoutCategory = files.filter(f => !f.category);
    if (filesWithoutCategory.length > 0) {
      toast.warning('Asigna una categoría a todos los archivos');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let successCount = 0;
      let errorCount = 0;

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        
        try {
          // Llamar al servicio con tipo_documento_id como metadata
          const result = await supabaseService.documentos.uploadFile(
            fileItem.file,
            carpetaId,
            fileItem.category,
            fileItem.tipoDocumentoId ? { tipo_documento_id: fileItem.tipoDocumentoId } : undefined
          );

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Error en resultado de subida para ${fileItem.file.name}:`, result);
            const errorMsg = result.details || result.error || 'Error desconocido';
            toast.error(`Error al subir ${fileItem.file.name}`, {
              description: errorMsg
            });
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Error al subir ${fileItem.file.name}:`, error);
          const errorMsg = error.message || error.toString();
          toast.error(`Error al subir ${fileItem.file.name}`, {
            description: errorMsg
          });
        }

        // Actualizar progress
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      // Mostrar resultado final
      if (successCount > 0) {
        toast.success(`${successCount} documento(s) subido(s) exitosamente`);
        onUploadSuccess();
        handleClose();
      }

      if (errorCount > 0 && successCount === 0) {
        toast.error('No se pudo subir ningún archivo');
      }
    } catch (error: any) {
      console.error('Error al subir archivos:', error);
      toast.error('Error al subir archivos', {
        description: error.message || 'Intenta nuevamente'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ========== CLOSE HANDLER ==========
  const handleClose = () => {
    // Limpiar previews
    files.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setFiles([]);
    setIsUploading(false);
    setUploadProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  // ========== RENDER ==========
  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[100dvh] sm:max-h-[90vh] sm:h-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Subir Documentos</h2>
              <p className="text-sm text-gray-600 mt-1">
                Carpeta: <span className="font-semibold text-blue-600">{carpetaNombre}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isDragging ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900 mb-1">
                    {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    o haz clic en el botón para seleccionar
                  </p>
                  <button
                    onClick={handleBrowseClick}
                    disabled={isUploading}
                    className="px-6 py-3 rounded-lg font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#003DA5' }}
                  >
                    Seleccionar archivos
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Formatos permitidos: PDF, JPG, PNG, Word, Excel</p>
                  <p>Tamaño máximo: 10MB por archivo</p>
                </div>
              </div>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  Archivos seleccionados ({files.length})
                </h3>
                <div className="space-y-3">
                  {files.map((fileItem) => {
                    const Icon = getFileIcon(fileItem.file.type);
                    const iconColor = getFileIconColor(fileItem.file.type);

                    return (
                      <div
                        key={fileItem.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
                      >
                        {/* Icon/Preview */}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${iconColor}15` }}
                        >
                          {fileItem.preview ? (
                            <img
                              src={fileItem.preview}
                              alt={fileItem.file.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Icon className="w-6 h-6" style={{ color: iconColor }} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileItem.file.size)}
                          </p>
                        </div>

                        {/* Category Selector */}
                        <select
                          value={fileItem.tipoDocumentoId || fileItem.category}
                          onChange={(e) => updateFileCategory(fileItem.id, e.target.value)}
                          disabled={isUploading}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ minWidth: '180px' }}
                        >
                          <option value="" disabled>Seleccionar tipo</option>
                          {tiposDocumentos.length > 0
                            ? tiposDocumentos.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </option>
                              ))
                            : FALLBACK_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                  {cat.label}
                                </option>
                              ))}
                        </select>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFile(fileItem.id)}
                          disabled={isUploading}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-900">
                    Subiendo archivos...
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t-2 border-gray-200 bg-gray-50 sm:rounded-b-2xl flex-shrink-0 gap-4 sm:gap-0">
            <p className="text-sm text-gray-600">
              {files.length === 0
                ? 'No hay archivos seleccionados'
                : `${files.length} archivo(s) listo(s) para subir`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className="px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ background: '#003DA5' }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Subir {files.length > 0 && `(${files.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </ModalPortal>
  );
}
