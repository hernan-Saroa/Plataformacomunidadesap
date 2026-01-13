/**
 * ============================================
 * MODAL CARGAR DOCUMENTO - EXPEDIENTE DE AUDITORÍA
 * ============================================
 * 
 * Modal completo para carga de documentos con:
 * - Selector de archivos (drag & drop / click)
 * - Metadata del documento (nombre, tipo, fase, descripción)
 * - Barra de progreso simulada
 * - Validaciones
 * - Preview del archivo seleccionado
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X, Upload, FileText, Clock, FileSearch, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { controlInternoService } from '../../../services/api/controlInternoService';

// ============ TIPOS ============

interface DocumentoExpediente {
  nombre: string;
  tipo: 'Oficio' | 'Carta' | 'Acta' | 'Informe' | 'Evidencia' | 'Lista-Chequeo' | 'Otro';
  fase: 'planeacion' | 'ejecucion' | 'comunicacion';
  size: string;
  descripcion?: string;
}

interface ModalCargarDocumentoProps {
  onClose: () => void;
  onGuardar: (documento: Partial<DocumentoExpediente>) => void;
  auditoriaId?: string;
}

// ============ COMPONENTE ============

export function ModalCargarDocumento({ onClose, onGuardar, auditoriaId }: ModalCargarDocumentoProps) {
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<DocumentoExpediente['tipo']>('Oficio');
  const [faseDocumento, setFaseDocumento] = useState<DocumentoExpediente['fase']>('planeacion');
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [progresoCarga, setProgresoCarga] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validarArchivo = (file: File): boolean => {
      // Validar tamaño (máx 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Archivo demasiado grande', {
          description: 'El tamaño máximo permitido es 10 MB',
        });
      return false;
    }

    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!tiposPermitidos.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/i)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten: PDF, Word, Excel, JPG, PNG',
      });
      return false;
    }

    return true;
  };

  const procesarArchivo = (file: File) => {
    if (!validarArchivo(file)) {
        return;
      }

      setArchivoSeleccionado(file);
      if (!nombreDocumento) {
        // Auto-completar nombre del documento sin extensión
        setNombreDocumento(file.name.replace(/\.[^/.]+$/, ''));
      }
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickSeleccionar = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (fileInputRef.current && !cargando) {
      fileInputRef.current.click();
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cargando && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo cambiar el estado si realmente salimos del área (no de un hijo)
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Cambiar el cursor para indicar que se puede soltar
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (cargando) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      procesarArchivo(file);
    } else {
      toast.error('No se pudo obtener el archivo', {
        description: 'Por favor, intente nuevamente',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const simularCarga = () => {
    return new Promise<void>((resolve) => {
      let progreso = 0;
      const intervalo = setInterval(() => {
        progreso += Math.random() * 30;
        if (progreso >= 100) {
          progreso = 100;
          setProgresoCarga(100);
          clearInterval(intervalo);
          setTimeout(resolve, 500);
        } else {
          setProgresoCarga(Math.min(progreso, 100));
        }
      }, 300);
    });
  };

  // Mapear tipo de documento del frontend al backend
  const mapearTipoDocumento = (tipo: DocumentoExpediente['tipo']): string => {
    const mapeo: Record<string, string> = {
      'Oficio': 'oficio_anuncio',
      'Carta': 'carta_compromiso',
      'Acta': 'acta_reunion_apertura',
      'Informe': 'informe_final',
      'Evidencia': 'evidencia_hallazgo',
      'Lista-Chequeo': 'lista_chequeo',
      'Otro': 'otro',
    };
    return mapeo[tipo] || 'otro';
  };

  const handleGuardar = async () => {
    if (!archivoSeleccionado || !nombreDocumento) {
      toast.error('Faltan datos requeridos', {
        description: 'Debe seleccionar un archivo y proporcionar un nombre',
      });
      return;
    }

    if (!auditoriaId) {
      toast.error('Error', {
        description: 'No se ha especificado la auditoría',
      });
      return;
    }

    setCargando(true);
    setProgresoCarga(0);

    try {
      // Subir documento a la base de datos con progreso
      const documentoSubido = await controlInternoService.createDocumento(
        archivoSeleccionado,
        {
          nombre: nombreDocumento,
          descripcion: descripcion || undefined,
          tipoDocumento: mapearTipoDocumento(tipoDocumento),
          etapa: faseDocumento,
          auditoriaId: auditoriaId,
          subidoPor: 'Usuario Actual', // TODO: Obtener del contexto de autenticación
        },
        (progress) => {
          setProgresoCarga(progress);
        }
      );

      // El documento ya viene del backend con todos los datos
      const nuevoDocumento: Partial<DocumentoExpediente> = {
        nombre: documentoSubido.nombre || nombreDocumento,
        tipo: tipoDocumento,
        fase: faseDocumento,
        size: formatFileSize(archivoSeleccionado.size),
        descripcion: documentoSubido.descripcion || descripcion,
      };

      toast.success('Documento cargado exitosamente', {
        description: `${nombreDocumento} agregado al expediente`,
      });

      onGuardar(nuevoDocumento);
      setCargando(false);
    } catch (error) {
      console.error('Error al cargar documento:', error);
      toast.error('Error al cargar el documento', {
        description: error instanceof Error ? error.message : 'Por favor, intente nuevamente',
      });
      setCargando(false);
      setProgresoCarga(0);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg text-white">Cargar Documento</h3>
              <p className="text-sm text-blue-100">Agregar archivo al expediente de auditoría</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cargando}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selector de archivo */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Archivo <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSeleccionarArchivo}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              className="hidden"
              disabled={cargando}
              id="file-input-documento"
            />
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onClick={(e) => {
                // Si no hay archivo seleccionado y no está cargando, activar el input
                if (!archivoSeleccionado && !cargando) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }
              }}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                cargando
                  ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50'
                  : archivoSeleccionado
                  ? 'border-green-300 bg-green-50'
                  : isDragging
                  ? 'border-blue-500 bg-blue-100 scale-105'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {archivoSeleccionado ? (
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-900">{archivoSeleccionado.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(archivoSeleccionado.size)}
                  </p>
                  {!cargando && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setArchivoSeleccionado(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Cambiar archivo
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${
                    isDragging ? 'bg-blue-200' : 'bg-gray-200'
                  }`}>
                    <Upload className={`w-8 h-8 transition-colors ${
                      isDragging ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className={`text-sm transition-colors ${
                    isDragging ? 'text-blue-700 font-medium' : 'text-gray-700'
                  }`}>
                    {isDragging 
                      ? 'Suelta el archivo aquí' 
                      : 'Haz clic para seleccionar o arrastra el archivo aquí'}
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, Imágenes (Máx. 10 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Barra de progreso */}
          {cargando && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Cargando documento...</span>
                <span className="text-gray-900">{Math.round(progresoCarga)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progresoCarga}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Nombre del documento */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Nombre del documento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreDocumento}
              onChange={(e) => setNombreDocumento(e.target.value)}
              placeholder="Ej: Oficio de Anuncio de Auditoría"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Tipo de documento */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as DocumentoExpediente['tipo'])}
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="Oficio">Oficio</option>
              <option value="Carta">Carta</option>
              <option value="Acta">Acta</option>
              <option value="Informe">Informe</option>
              <option value="Evidencia">Evidencia</option>
              <option value="Lista-Chequeo">Lista de Chequeo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Fase */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Fase de auditoría <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'planeacion', label: 'Planeación', icon: FileSearch, color: 'purple' },
                { value: 'ejecucion', label: 'Ejecución', icon: ClipboardCheck, color: 'amber' },
                { value: 'comunicacion', label: 'Comunicación', icon: FileText, color: 'green' },
              ].map((fase) => {
                const Icon = fase.icon;
                const isSelected = faseDocumento === fase.value;
                return (
                  <button
                    key={fase.value}
                    onClick={() => setFaseDocumento(fase.value as DocumentoExpediente['fase'])}
                    disabled={cargando}
                    className={`p-3 rounded-lg border-2 transition-all text-center disabled:opacity-50 ${
                      isSelected
                        ? `border-${fase.color}-500 bg-${fase.color}-50`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: fase.color === 'purple' ? '#8B5CF6' : fase.color === 'amber' ? '#F59E0B' : '#10B981',
                            backgroundColor: fase.color === 'purple' ? '#F3E8FF' : fase.color === 'amber' ? '#FEF3C7' : '#D1FAE5',
                          }
                        : {}
                    }
                  >
                    <Icon
                      className={`w-5 h-5 mx-auto mb-1 ${
                        isSelected 
                          ? (fase.color === 'purple' ? 'text-purple-600' : fase.color === 'amber' ? 'text-amber-600' : 'text-green-600')
                          : 'text-gray-400'
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        isSelected 
                          ? (fase.color === 'purple' ? 'text-purple-900' : fase.color === 'amber' ? 'text-amber-900' : 'text-green-900')
                          : 'text-gray-600'
                      }`}
                    >
                      {fase.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descripción opcional */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Descripción <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Agregue información adicional sobre este documento..."
              disabled={cargando}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <ButtonSIGL variant="ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={handleGuardar}
            disabled={!archivoSeleccionado || !nombreDocumento || cargando}
            icon={cargando ? <Clock className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            iconPosition="left"
          >
            {cargando ? 'Cargando...' : 'Cargar Documento'}
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}