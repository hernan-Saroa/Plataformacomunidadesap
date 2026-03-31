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

// ============ TIPOS ============

interface DocumentoExpediente {
  nombre: string;
  tipo: 'Oficio' | 'Carta' | 'Acta' | 'Informe' | 'Evidencia' | 'Lista-Chequeo' | 'Otro';
  fase: 'planeacion' | 'ejecucion' | 'comunicacion';
  size: string;
  descripcion?: string;
}

// ✅ Tipo extendido que incluye el archivo
export interface DocumentoConArchivo extends Partial<DocumentoExpediente> {
  archivo?: File;
}

interface ModalCargarDocumentoProps {
  onClose: () => void;
  onGuardar: (documento: DocumentoConArchivo) => void;
  loading?: boolean; // Para indicar que el padre está procesando
}

// ============ COMPONENTE ============

export function ModalCargarDocumento({ onClose, onGuardar, loading }: ModalCargarDocumentoProps) {
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<DocumentoExpediente['tipo']>('Oficio');
  const [faseDocumento, setFaseDocumento] = useState<DocumentoExpediente['fase']>('planeacion');
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [progresoCarga, setProgresoCarga] = useState(0);
  const [cargando, setCargando] = useState(false);
  // ✅ CORREGIDO: Usar useRef en lugar de useState para la referencia del input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (máx 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Archivo demasiado grande', {
          description: 'El tamaño máximo permitido es 10 MB',
        });
        return;
      }

      setArchivoSeleccionado(file);
      if (!nombreDocumento) {
        // Auto-completar nombre del documento sin extensión
        setNombreDocumento(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleClickSeleccionar = () => {
    // ✅ CORREGIDO: Acceder a .current del useRef
    if (fileInputRef.current) {
      fileInputRef.current.click();
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

  const handleGuardar = async () => {
    if (!archivoSeleccionado || !nombreDocumento) {
      toast.error('Faltan datos requeridos', {
        description: 'Debe seleccionar un archivo y proporcionar un nombre',
      });
      return;
    }

    // ✅ CONECTADO AL BACKEND: Pasar el archivo real junto con los metadatos
    const nuevoDocumento: DocumentoConArchivo = {
      nombre: nombreDocumento,
      tipo: tipoDocumento,
      fase: faseDocumento,
      size: formatFileSize(archivoSeleccionado.size),
      descripcion,
      archivo: archivoSeleccionado, // ✅ Incluir el archivo para subir al backend
    };

    // La carga real se maneja en el componente padre
    onGuardar(nuevoDocumento);
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
        onClick={(e) => {
          // Solo detener propagación al backdrop, no bloquear clicks internos
          e.stopPropagation();
        }}
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
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                console.log('[ModalCargarDocumento] Click en área de selección');
                if (fileInputRef.current && !cargando) {
                  fileInputRef.current.click();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (fileInputRef.current && !cargando) {
                    fileInputRef.current.click();
                  }
                }
              }}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                archivoSeleccionado
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              } ${cargando ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        e.stopPropagation();
                        setArchivoSeleccionado(null);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Cambiar archivo
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-700">
                    Haz clic para seleccionar o arrastra el archivo aquí
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
          <ButtonSIGL variant="ghost" onClick={onClose} disabled={cargando || loading}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={handleGuardar}
            disabled={!archivoSeleccionado || !nombreDocumento || cargando || loading}
            icon={(cargando || loading) ? <Clock className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            iconPosition="left"
          >
            {(cargando || loading) ? 'Subiendo...' : 'Cargar Documento'}
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}