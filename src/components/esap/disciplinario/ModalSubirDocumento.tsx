/**
 * MODAL SUBIR DOCUMENTO - RF003
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X, Upload, FileText, File, Image, FileSpreadsheet,
  Trash2, Check, AlertCircle, Paperclip, Plus, Info
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

interface ModalSubirDocumentoProps {
  isOpen?: boolean;
  proceso: any;
  onClose: () => void;
  onConfirm: (documentos: DocumentoNuevo[]) => void;
}

interface DocumentoNuevo {
  archivo: File;
  etapaAsociada: string;
  tipoDocumento: string;
  descripcion: string;
}

const ETAPAS_DISPONIBLES = [
  'Radicación',
  'Valoración',
  'Inhibitorio',
  'Indagación Preliminar',
  'Investigación',
  'Juzgamiento',
  'Fallo',
  'Recurso de Apelación',
  'Ejecutoria'
];

const TIPOS_DOCUMENTO = [
  'Auto',
  'Notificación',
  'Prueba Documental',
  'Declaración',
  'Oficio',
  'Respuesta',
  'Descargos',
  'Recurso',
  'Otro'
];

// Definir los tipos MIME y extensiones permitidas por tipo de documento
const VALIDACIONES_POR_TIPO: Record<string, { mimeTypes: string[]; extensiones: string[]; label: string }> = {
  // Evidencias: HTML, PDF, Word, Excel, Imágenes, Videos
  'Prueba Documental': {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/html',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ],
    extensiones: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.html', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi'],
    label: 'PDF, Word, Excel, HTML, Imágenes, Videos'
  },
  // Auto: Solo PDF
  'Auto': {
    mimeTypes: ['application/pdf'],
    extensiones: ['.pdf'],
    label: 'Solo PDF'
  },
  // Oficio: Solo PDF
  'Oficio': {
    mimeTypes: ['application/pdf'],
    extensiones: ['.pdf'],
    label: 'Solo PDF'
  },
  // Otros: PDF, Word, Excel
  'default': {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensiones: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    label: 'PDF, Word, Excel'
  }
};

// Función para obtener la validación según el tipo de documento
const getValidacionPorTipo = (tipo: string) => {
  // Mapear tipos específicos a sus validaciones
  if (tipo === 'Prueba Documental') {
    return VALIDACIONES_POR_TIPO['Prueba Documental'];
  }
  if (tipo === 'Auto') {
    return VALIDACIONES_POR_TIPO['Auto'];
  }
  if (tipo === 'Oficio') {
    return VALIDACIONES_POR_TIPO['Oficio'];
  }
  // Para Notificación, Declaración, Respuesta, Descargos, Recurso, Otro
  return VALIDACIONES_POR_TIPO['default'];
};

export function ModalSubirDocumento({ isOpen = true, proceso, onClose, onConfirm }: ModalSubirDocumentoProps) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(proceso.etapaActual || 'Valoración');
  const [tipoDocumento, setTipoDocumento] = useState('Auto');
  const [descripcion, setDescripcion] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    agregarArchivos(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      agregarArchivos(files);
    }
  };

  const agregarArchivos = (nuevosArchivos: File[]) => {
    // Obtener la validación según el tipo de documento seleccionado
    const validacion = getValidacionPorTipo(tipoDocumento);
    
    const archivosValidos = nuevosArchivos.filter(archivo => {
      // Validar tipo MIME
      const mimeValido = validacion.mimeTypes.includes(archivo.type);
      
      // Validar extensión como respaldo
      const extension = '.' + archivo.name.split('.').pop()?.toLowerCase();
      const extensionValida = validacion.extensiones.includes(extension);
      
      if (!mimeValido && !extensionValida) {
        toast.error(`Archivo no permitido: ${archivo.name}`, {
          description: `Para tipo "${tipoDocumento}" solo se permiten: ${validacion.label}`
        });
        return false;
      }
      
      if (archivo.size > 10 * 1024 * 1024) {
        toast.error(`Archivo muy grande: ${archivo.name}`, {
          description: 'El tamaño máximo es 10 MB'
        });
        return false;
      }
      
      return true;
    });
    
    setArchivos([...archivos, ...archivosValidos]);
    
    if (archivosValidos.length > 0) {
      toast.success(`${archivosValidos.length} archivo(s) agregado(s)`);
    }
  };

  const eliminarArchivo = (index: number) => {
    const nuevosArchivos = archivos.filter((_, i) => i !== index);
    setArchivos(nuevosArchivos);
    toast.info('Archivo eliminado de la lista');
  };

  const handleConfirmar = () => {
    if (archivos.length === 0) {
      toast.error('No hay archivos', {
        description: 'Debes agregar al menos un archivo para continuar'
      });
      return;
    }

    const documentos: DocumentoNuevo[] = archivos.map(archivo => ({
      archivo,
      etapaAsociada: etapaSeleccionada,
      tipoDocumento,
      descripcion
    }));

    onConfirm(documentos);
    toast.success('Documentos Cargados', {
      description: `${archivos.length} documento(s) agregado(s) al proceso ${proceso.numero}`
    });
    onClose();
  };

  const getIconoArchivo = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5" style={{ color: '#DC2626' }} />;
    if (tipo.includes('word')) return <FileText className="w-5 h-5" style={{ color: '#2563EB' }} />;
    if (tipo.includes('excel') || tipo.includes('sheet')) return <FileSpreadsheet className="w-5 h-5" style={{ color: '#059669' }} />;
    if (tipo.includes('image')) return <Image className="w-5 h-5" style={{ color: '#8B5CF6' }} />;
    return <File className="w-5 h-5" style={{ color: '#6B7280' }} />;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4"
      style={{ zIndex: 9998 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                <Upload className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Cargar Documentos
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Proceso: {proceso.numero}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Etapa y Tipo */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Etapa del Proceso *
              </label>
              <select
                value={etapaSeleccionada}
                onChange={(e) => setEtapaSeleccionada(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                style={{ borderColor: '#E5E7EB' }}
              >
                {ETAPAS_DISPONIBLES.map(etapa => (
                  <option key={etapa} value={etapa}>{etapa}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Tipo de Documento *
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                style={{ borderColor: '#E5E7EB' }}
              >
                {TIPOS_DOCUMENTO.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Descripción (Opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción breve del documento o contexto..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Área de Drag & Drop */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Archivos *
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-[#003DA5] bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                  <Upload className="w-8 h-8" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                    Arrastra y suelta archivos aquí
                  </p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    o haz clic para seleccionar
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <Info className="w-4 h-4" />
                  <span>Máx. 10 MB</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  tipoDocumento === 'Prueba Documental'
                    ? ".pdf,.doc,.docx,.xls,.xlsx,.html,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi"
                    : tipoDocumento === 'Auto' || tipoDocumento === 'Oficio'
                    ? ".pdf"
                    : ".pdf,.doc,.docx,.xls,.xlsx"
                }
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Lista de archivos */}
          {archivos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                  Archivos Seleccionados
                </p>
                <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {archivos.length} {archivos.length === 1 ? 'archivo' : 'archivos'}
                </Badge>
              </div>
              <div className="space-y-2">
                {archivos.map((archivo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl border-2"
                    style={{ borderColor: '#E5E7EB', background: '#F8FAFC' }}
                  >
                    <div className="flex-shrink-0">
                      {getIconoArchivo(archivo.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1F2937' }}>
                        {archivo.name}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        {(archivo.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarArchivo(index);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={archivos.length === 0}
              className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#003DA5' }}
            >
              <Upload className="w-4 h-4" />
              Cargar {archivos.length > 0 && `(${archivos.length})`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
