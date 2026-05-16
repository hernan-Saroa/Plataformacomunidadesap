/**
 * MODAL: SUBIR NUEVA VERSIÓN
 * 
 * Permite crear una nueva versión de un documento existente
 * - Drag & Drop de archivo
 * - Comentarios de cambios (tipo Git commit)
 * - Etiquetas de versión
 * - Preview del archivo a subir
 * 
 * @version 1.0.0
 * @date 2026-03-02
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  X, Upload, FileText, Image as ImageIcon, File, Check,
  AlertCircle, GitBranch, Tag, MessageSquare, Loader2
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { supabaseService } from '../../services/api/supabase.service';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

type VersionTag = '' | 'DRAFT' | 'REVIEW' | 'APPROVED' | 'FINAL';

interface DocumentNewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentoId: string;
  documentoNombre: string;
  versionActual: number;
  onVersionCreated?: () => void;
}

// ============================================================================
// UTILS
// ============================================================================

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('pdf')) return FileText;
  if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('png')) return ImageIcon;
  return File;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentNewVersionModal({
  isOpen,
  onClose,
  documentoId,
  documentoNombre,
  versionActual,
  onVersionCreated
}: DocumentNewVersionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [etiqueta, setEtiqueta] = useState<VersionTag>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ========== DRAG & DROP ==========
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validar tamaño (10MB máximo)
    if (selectedFile.size > 10485760) {
      toast.error('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    setFile(selectedFile);

    // Generar preview para imágenes
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  // ========== UPLOAD ==========
  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecciona un archivo');
      return;
    }

    if (!comentarios.trim()) {
      toast.warning('Agrega un comentario describiendo los cambios');
      return;
    }

    try {
      setIsUploading(true);

      const result = await supabaseService.documentos.crearNuevaVersion(
        documentoId,
        file,
        comentarios,
        etiqueta,
        'Usuario Actual' // TODO: Obtener del contexto de autenticación
      );

      if (result.success) {
        toast.success(`Versión ${versionActual + 1} creada exitosamente`);
        onVersionCreated?.();
        handleClose();
      } else {
        throw new Error(result.error || 'Error al crear versión');
      }
    } catch (err: any) {
      console.error('❌ Error al crear versión:', err);
      toast.error('Error al crear nueva versión', {
        description: err.message || 'Intenta nuevamente'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setComentarios('');
    setEtiqueta('');
    setPreviewUrl(null);
    onClose();
  };

  // ========== RENDER ==========
  if (!isOpen) return null;

  const Icon = file ? getFileIcon(file.type) : Upload;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-full max-h-[100dvh] sm:h-auto sm:max-h-[90vh] pointer-events-auto"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-white flex-shrink-0 sm:rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" 
                style={{ background: '#E3F2FD' }}>
                <GitBranch className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Nueva Versión
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    v{versionActual} → v{versionActual + 1}
                  </Badge>
                </h2>
                <p className="text-sm text-gray-600 mt-1">{documentoNombre}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Drag & Drop Zone */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onClick={() => document.getElementById('file-input-version')?.click()}
            >
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-base font-semibold text-gray-900 mb-1">
                  {isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra el archivo o haz clic'}
                </p>
                <p className="text-sm text-gray-600">
                  PDF, Imágenes, Word, Excel • Máx. 10MB
                </p>
              </div>
              <input
                id="file-input-version"
                type="file"
                accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            /* File Preview */
            <div className="border-2 border-blue-300 rounded-xl p-4 bg-blue-50">
              <div className="flex items-start gap-3">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-600">{formatSize(file.size)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                      <Check className="w-3 h-3 mr-1" />
                      Listo para subir
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comentarios de cambios *
            </label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Describe qué cambios incluye esta versión... (ej: 'Actualizado según observaciones del coordinador')"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Similar a un mensaje de commit en Git - describe los cambios realizados
            </p>
          </div>

          {/* Etiqueta */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Etiqueta (opcional)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: '', label: 'Sin etiqueta', color: 'bg-gray-100 border-gray-300 text-gray-700' },
                { value: 'DRAFT', label: 'Borrador', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                { value: 'REVIEW', label: 'Revisión', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                { value: 'APPROVED', label: 'Aprobado', color: 'bg-green-100 border-green-300 text-green-700' },
                { value: 'FINAL', label: 'Final', color: 'bg-purple-100 border-purple-300 text-purple-700' },
              ].map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => setEtiqueta(tag.value as VersionTag)}
                  disabled={isUploading}
                  className={`px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                    etiqueta === tag.value
                      ? `${tag.color} ring-2 ring-offset-2 ring-blue-500`
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  } disabled:opacity-50`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Control de versiones automático</p>
              <p>
                La versión actual (v{versionActual}) se mantendrá en el historial. 
                Esta nueva versión (v{versionActual + 1}) se convertirá en la versión activa.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t-2 border-gray-200 bg-gray-50 flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0 sm:rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-6 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !comentarios.trim() || isUploading}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: '#003DA5' }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando versión...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Crear versión v{versionActual + 1}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
