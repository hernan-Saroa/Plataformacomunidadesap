/**
 * Componente de Carga de Archivos con Drag & Drop
 * Sistema completo de upload con validaciones y preview
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  File,
  FileText,
  Image,
  FileArchive,
  X,
  Check,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  Plus,
  Loader2,
  FilePdf,
  FileSpreadsheet,
  FileVideo,
  Music,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface ArchivoSubido {
  id: string;
  file: File;
  nombre: string;
  tipo: string;
  tamaño: number;
  preview?: string;
  estado: 'uploading' | 'success' | 'error';
  progreso: number;
  error?: string;
}

interface FileUploadDragDropProps {
  /** Tipos de archivo permitidos (ej: ['image/*', 'application/pdf']) */
  acceptedTypes?: string[];
  /** Tamaño máximo en MB */
  maxSizeMB?: number;
  /** Máximo número de archivos */
  maxFiles?: number;
  /** Permitir múltiples archivos */
  multiple?: boolean;
  /** Callback cuando se suben archivos */
  onUpload?: (archivos: File[]) => void;
  /** Callback cuando se elimina un archivo */
  onRemove?: (id: string) => void;
  /** Texto personalizado */
  label?: string;
  descripcion?: string;
  /** Modo compacto */
  compact?: boolean;
}

export function FileUploadDragDrop({
  acceptedTypes = ['*/*'],
  maxSizeMB = 10,
  maxFiles = 5,
  multiple = true,
  onUpload,
  onRemove,
  label = 'Subir archivos',
  descripcion = 'Arrastra archivos aquí o haz clic para seleccionar',
  compact = false
}: FileUploadDragDropProps) {
  const [archivos, setArchivos] = useState<ArchivoSubido[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith('image/')) return Image;
    if (tipo.includes('pdf')) return FilePdf;
    if (tipo.includes('spreadsheet') || tipo.includes('excel')) return FileSpreadsheet;
    if (tipo.startsWith('video/')) return FileVideo;
    if (tipo.startsWith('audio/')) return Music;
    if (tipo.includes('zip') || tipo.includes('rar')) return FileArchive;
    return FileText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Validar tipo
    if (acceptedTypes[0] !== '*/*') {
      const isValidType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          const categoria = type.split('/')[0];
          return file.type.startsWith(categoria + '/');
        }
        return file.type === type;
      });
      
      if (!isValidType) {
        return `Tipo de archivo no permitido. Solo se permiten: ${acceptedTypes.join(', ')}`;
      }
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `El archivo excede el tamaño máximo de ${maxSizeMB}MB`;
    }

    return null;
  };

  const simulateUpload = (archivo: ArchivoSubido): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progreso = 0;
      const interval = setInterval(() => {
        progreso += Math.random() * 30;
        
        if (progreso >= 100) {
          progreso = 100;
          clearInterval(interval);
          
          setArchivos(prev => prev.map(a => 
            a.id === archivo.id 
              ? { ...a, progreso: 100, estado: 'success' }
              : a
          ));
          
          resolve();
        } else {
          setArchivos(prev => prev.map(a => 
            a.id === archivo.id 
              ? { ...a, progreso }
              : a
          ));
        }
      }, 200);

      // Simular error ocasional (5% probabilidad)
      if (Math.random() < 0.05) {
        setTimeout(() => {
          clearInterval(interval);
          setArchivos(prev => prev.map(a => 
            a.id === archivo.id 
              ? { ...a, estado: 'error', error: 'Error al subir el archivo' }
              : a
          ));
          reject(new Error('Error al subir'));
        }, 1000);
      }
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    
    // Validar número máximo de archivos
    if (archivos.length + filesArray.length > maxFiles) {
      toast.error(`Solo puedes subir un máximo de ${maxFiles} archivos`);
      return;
    }

    const nuevosArchivos: ArchivoSubido[] = [];

    for (const file of filesArray) {
      const error = validateFile(file);
      
      if (error) {
        toast.error(error);
        continue;
      }

      const archivoSubido: ArchivoSubido = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size,
        estado: 'uploading',
        progreso: 0
      };

      // Generar preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setArchivos(prev => prev.map(a => 
            a.id === archivoSubido.id 
              ? { ...a, preview: e.target?.result as string }
              : a
          ));
        };
        reader.readAsDataURL(file);
      }

      nuevosArchivos.push(archivoSubido);
    }

    setArchivos(prev => [...prev, ...nuevosArchivos]);

    // Simular upload para cada archivo
    for (const archivo of nuevosArchivos) {
      try {
        await simulateUpload(archivo);
        toast.success(`${archivo.nombre} subido correctamente`);
      } catch (error) {
        toast.error(`Error al subir ${archivo.nombre}`);
      }
    }

    // Callback con archivos exitosos
    if (onUpload) {
      const archivosExitosos = nuevosArchivos
        .filter(a => a.estado === 'success')
        .map(a => a.file);
      onUpload(archivosExitosos);
    }
  };

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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [archivos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setArchivos(prev => prev.filter(a => a.id !== id));
    if (onRemove) {
      onRemove(id);
    }
    toast.info('Archivo eliminado');
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const archivosExitosos = archivos.filter(a => a.estado === 'success').length;
  const archivosConError = archivos.filter(a => a.estado === 'error').length;

  if (compact) {
    return (
      <div className="space-y-3">
        <button
          onClick={handleClickUpload}
          className="w-full px-4 py-3 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {label}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {archivos.length > 0 && (
          <div className="space-y-2">
            {archivos.map((archivo) => {
              const Icon = getFileIcon(archivo.tipo);
              
              return (
                <div key={archivo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-white rounded">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{archivo.nombre}</div>
                    {archivo.estado === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div
                          className="h-1 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${archivo.progreso}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {archivo.estado === 'success' && <Check className="w-4 h-4 text-green-600" />}
                  {archivo.estado === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  <button
                    onClick={() => handleRemoveFile(archivo.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
          isDragging
            ? 'border-[#003DA5] bg-blue-50 scale-[1.02]'
            : 'border-gray-300 hover:border-[#003DA5] hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-center">
          <div className={`inline-flex p-4 rounded-full mb-4 ${
            isDragging ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Upload className={`w-8 h-8 ${
              isDragging ? 'text-[#003DA5]' : 'text-gray-600'
            }`} />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{label}</h3>
          <p className="text-sm text-gray-600 mb-4">{descripcion}</p>
          
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Máximo {maxFiles} archivos</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Hasta {maxSizeMB}MB por archivo</span>
            </div>
          </div>

          {acceptedTypes[0] !== '*/*' && (
            <div className="mt-3 text-xs text-gray-500">
              Tipos permitidos: {acceptedTypes.map(t => t.split('/')[1] || t).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {archivos.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-gray-700">
              {archivos.filter(a => a.estado === 'uploading').length} subiendo
            </span>
          </div>
          {archivosExitosos > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-gray-700">{archivosExitosos} completados</span>
            </div>
          )}
          {archivosConError > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-gray-700">{archivosConError} con error</span>
            </div>
          )}
        </div>
      )}

      {/* Lista de Archivos */}
      <AnimatePresence>
        {archivos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {archivos.map((archivo, index) => {
              const Icon = getFileIcon(archivo.tipo);
              
              return (
                <motion.div
                  key={archivo.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Preview o Ícono */}
                    <div className="flex-shrink-0">
                      {archivo.preview ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={archivo.preview}
                            alt={archivo.nombre}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate">{archivo.nombre}</h4>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(archivo.tamaño)}
                          </p>
                        </div>
                        
                        {/* Estado */}
                        <div className="flex items-center gap-2 ml-4">
                          {archivo.estado === 'uploading' && (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          )}
                          {archivo.estado === 'success' && (
                            <div className="p-1 bg-green-100 rounded-full">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                          {archivo.estado === 'error' && (
                            <div className="p-1 bg-red-100 rounded-full">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                          )}
                          
                          <button
                            onClick={() => handleRemoveFile(archivo.id)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      {archivo.estado === 'uploading' && (
                        <div className="space-y-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                              style={{ width: `${archivo.progreso}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(archivo.progreso)}% completado
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {archivo.estado === 'error' && archivo.error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{archivo.error}</span>
                        </div>
                      )}

                      {/* Success */}
                      {archivo.estado === 'success' && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                          <Check className="w-4 h-4" />
                          <span>Archivo subido correctamente</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón para agregar más */}
      {archivos.length > 0 && archivos.length < maxFiles && (
        <button
          onClick={handleClickUpload}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-semibold hover:border-[#003DA5] hover:text-[#003DA5] hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar más archivos ({archivos.length}/{maxFiles})
        </button>
      )}
    </div>
  );
}
