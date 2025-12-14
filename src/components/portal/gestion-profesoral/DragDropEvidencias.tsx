/**
 * Drag & Drop Evidencias - UX Clase Mundial
 * Componente moderno para cargar archivos con arrastrar y soltar
 */

import { useState, useRef, DragEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  File,
  FileText,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';

interface Archivo {
  id: string;
  nombre: string;
  tamaño: number;
  tipo: string;
  url?: string;
  estado: 'cargando' | 'completado' | 'error';
  progreso: number;
  mensajeError?: string;
}

interface DragDropEvidenciasProps {
  actividadNombre: string;
  actividadHoras: number;
  maxArchivos?: number;
  maxTamañoMB?: number;
  tiposPermitidos?: string[];
  onArchivosChange: (archivos: Archivo[]) => void;
}

export function DragDropEvidencias({
  actividadNombre,
  actividadHoras,
  maxArchivos = 3,
  maxTamañoMB = 20,
  tiposPermitidos = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
  onArchivosChange
}: DragDropEvidenciasProps) {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    procesarArchivos(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      procesarArchivos(files);
    }
  };

  const procesarArchivos = (files: File[]) => {
    // Validar cantidad
    if (archivos.length + files.length > maxArchivos) {
      alert(`Solo puedes subir máximo ${maxArchivos} archivos`);
      return;
    }

    files.forEach((file) => {
      // Validar tipo
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!tiposPermitidos.includes(extension)) {
        const nuevoArchivo: Archivo = {
          id: Math.random().toString(36).substr(2, 9),
          nombre: file.name,
          tamaño: file.size,
          tipo: file.type,
          estado: 'error',
          progreso: 0,
          mensajeError: `El formato ${extension.toUpperCase()} no está permitido`
        };
        setArchivos(prev => [...prev, nuevoArchivo]);
        return;
      }

      // Validar tamaño
      const tamañoMB = file.size / (1024 * 1024);
      if (tamañoMB > maxTamañoMB) {
        const nuevoArchivo: Archivo = {
          id: Math.random().toString(36).substr(2, 9),
          nombre: file.name,
          tamaño: file.size,
          tipo: file.type,
          estado: 'error',
          progreso: 0,
          mensajeError: `El archivo excede el tamaño máximo de ${maxTamañoMB}MB`
        };
        setArchivos(prev => [...prev, nuevoArchivo]);
        return;
      }

      // Simular carga
      const nuevoArchivo: Archivo = {
        id: Math.random().toString(36).substr(2, 9),
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type,
        estado: 'cargando',
        progreso: 0
      };

      setArchivos(prev => [...prev, nuevoArchivo]);

      // Simular progreso de carga
      simularCarga(nuevoArchivo.id);
    });
  };

  const simularCarga = (archivoId: string) => {
    let progreso = 0;
    const interval = setInterval(() => {
      progreso += Math.random() * 30;
      if (progreso >= 100) {
        progreso = 100;
        clearInterval(interval);
        setArchivos(prev =>
          prev.map(a =>
            a.id === archivoId
              ? { ...a, estado: 'completado', progreso: 100 }
              : a
          )
        );
      } else {
        setArchivos(prev =>
          prev.map(a =>
            a.id === archivoId
              ? { ...a, progreso }
              : a
          )
        );
      }
    }, 500);
  };

  const eliminarArchivo = (archivoId: string) => {
    setArchivos(prev => prev.filter(a => a.id !== archivoId));
  };

  const formatearTamaño = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getIconoArchivo = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (tipo.includes('word') || tipo.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (tipo.includes('sheet') || tipo.includes('excel')) return <File className="w-5 h-5 text-green-500" />;
    if (tipo.includes('presentation') || tipo.includes('powerpoint')) return <File className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const archivosCompletados = archivos.filter(a => a.estado === 'completado').length;
  const espaciosRestantes = maxArchivos - archivos.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Cargar evidencias</h3>
          <p className="text-sm text-gray-600 mt-1">
            Actividad: {actividadNombre} • {actividadHoras}h
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            {archivosCompletados} de {maxArchivos}
          </p>
          <p className="text-xs text-gray-500">archivos cargados</p>
        </div>
      </div>

      {/* Zona de Drop */}
      {archivos.length < maxArchivos && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-[#003DA5] bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={tiposPermitidos.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <motion.div
            animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${isDragging ? 'bg-blue-100' : 'bg-gray-200'}
              transition-colors
            `}>
              <Upload className={`
                w-8 h-8
                ${isDragging ? 'text-[#003DA5]' : 'text-gray-500'}
                transition-colors
              `} />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {isDragging
                  ? 'Suelta los archivos aquí'
                  : 'Arrastra archivos aquí o haz clic para buscar'
                }
              </p>
              <p className="text-sm text-gray-600">
                {tiposPermitidos.map(t => t.toUpperCase()).join(', ')} • Máx {maxTamañoMB}MB cada uno
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lista de archivos */}
      {archivos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            ARCHIVOS CARGADOS ({archivos.length}/{maxArchivos})
          </h4>

          <AnimatePresence>
            {archivos.map((archivo) => (
              <motion.div
                key={archivo.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`
                  bg-white border-2 rounded-xl p-4
                  ${archivo.estado === 'error'
                    ? 'border-red-300 bg-red-50'
                    : archivo.estado === 'completado'
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icono */}
                  <div className="flex-shrink-0 mt-1">
                    {archivo.estado === 'completado' ? (
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    ) : archivo.estado === 'error' ? (
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {getIconoArchivo(archivo.tipo)}
                        <p className="font-medium text-gray-900 truncate">
                          {archivo.nombre}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 flex-shrink-0">
                        {formatearTamaño(archivo.tamaño)}
                      </p>
                    </div>

                    {/* Progreso o error */}
                    {archivo.estado === 'cargando' && (
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${archivo.progreso}%` }}
                            className="h-full bg-blue-500"
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-gray-600">
                          Subiendo... {Math.round(archivo.progreso)}%
                        </p>
                      </div>
                    )}

                    {archivo.estado === 'completado' && (
                      <p className="text-sm text-green-700">
                        ✓ Subido correctamente
                      </p>
                    )}

                    {archivo.estado === 'error' && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-2 mt-2">
                        <p className="text-sm text-red-900">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {archivo.mensajeError || 'Error al subir el archivo'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {archivo.estado === 'completado' && (
                      <>
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Ver archivo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => eliminarArchivo(archivo.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Botón agregar más */}
      {archivos.length > 0 && archivos.length < maxArchivos && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl p-4 text-center transition-colors group"
        >
          <div className="flex items-center justify-center gap-2 text-gray-600 group-hover:text-gray-900">
            <Upload className="w-5 h-5" />
            <span className="font-medium">
              + Agregar más archivos (quedan {espaciosRestantes} {espaciosRestantes === 1 ? 'espacio' : 'espacios'})
            </span>
          </div>
        </button>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <span className="font-medium">ℹ️ Importante:</span> Los archivos son revisados por el aprobador. 
          Asegúrate de subir documentos que soporten la actividad registrada.
        </p>
      </div>
    </div>
  );
}
