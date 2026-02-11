/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL SUBIR DOCUMENTO - DISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal para cargar evidencias/documentos al Expediente Electrónico.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Diseño World Class con ResponsiveModal
 * - ✅ Campos obligatorios: Etapa, Tipo, Nombre, Archivos
 * - ✅ Campo opcional: Descripción Detallada
 * - ✅ Drag & Drop de archivos
 * - ✅ Validaciones automáticas (formato, tamaño)
 * - ✅ Vista previa de archivos seleccionados
 * - ✅ Diseño corporativo ESAP
 * - ✅ Responsive Mobile First
 * 
 * @version 2.0.0 (World Class)
 * @date 10 de Febrero de 2026
 */

import { useState, useRef } from 'react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@/components/ui/ModalButtons';
import {
  Upload, FileText, File, Image, FileSpreadsheet,
  Trash2, AlertCircle, Info
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ModalSubirDocumentoProps {
  isOpen: boolean;
  proceso: any;
  onClose: () => void;
  onConfirm: (documentos: DocumentoNuevo[]) => void;
}

interface DocumentoNuevo {
  archivo: File;
  etapaAsociada: string;
  tipoDocumento: string;
  nombreEvidencia: string; // ✅ Nombre de la evidencia (obligatorio)
  descripcion: string; // Descripción detallada (opcional)
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModalSubirDocumento({ 
  isOpen, 
  proceso, 
  onClose, 
  onConfirm 
}: ModalSubirDocumentoProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────
  
  const [archivos, setArchivos] = useState<File[]>([]);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(proceso.etapaActual || 'Valoración');
  const [tipoDocumento, setTipoDocumento] = useState('Prueba Documental');
  const [nombreEvidencia, setNombreEvidencia] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // DRAG & DROP HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // FILE HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const agregarArchivos = (nuevosArchivos: File[]) => {
    const permitidos = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 
      'image/png', 
      'image/jpg'
    ];
    
    const archivosValidos = nuevosArchivos.filter(archivo => {
      if (!permitidos.includes(archivo.type)) {
        toast.error(`Archivo no permitido: ${archivo.name}`, {
          description: 'Solo se permiten PDF, Word, Excel e imágenes'
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

  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  const handleConfirmar = async () => {
    // Validaciones
    if (archivos.length === 0) {
      toast.error('No hay archivos', {
        description: 'Debes agregar al menos un archivo para continuar'
      });
      return;
    }

    if (!nombreEvidencia.trim()) {
      toast.error('Nombre obligatorio', {
        description: 'Debes ingresar un nombre para la evidencia'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 800));

      const documentos: DocumentoNuevo[] = archivos.map(archivo => ({
        archivo,
        etapaAsociada: etapaSeleccionada,
        tipoDocumento,
        nombreEvidencia: nombreEvidencia.trim(),
        descripcion: descripcion.trim()
      }));

      onConfirm(documentos);
      
      toast.success('Documentos Cargados', {
        description: `${archivos.length} documento(s) agregado(s) al proceso ${proceso.numeroProceso || proceso.numero}`,
        duration: 4000
      });

      handleReset();
      onClose();
    } catch (error) {
      toast.error('Error al cargar documentos');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RESET HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setArchivos([]);
    setNombreEvidencia('');
    setDescripcion('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      handleReset();
      onClose();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const getIconoArchivo = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (tipo.includes('word')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (tipo.includes('excel') || tipo.includes('sheet')) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    if (tipo.includes('image')) return <Image className="w-5 h-5 text-purple-600" />;
    return <File className="w-5 h-5 text-gray-600" />;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  const isFormValid = archivos.length > 0 && nombreEvidencia.trim().length > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cargar Documentos"
      subtitle={`Proceso: ${proceso.numeroProceso || proceso.numero}`}
      size="lg"
      disableBackdropClick={isSubmitting}
      disableEscapeKey={isSubmitting}
      footer={
        <ModalButtonGroup>
          <ModalButtonCancel onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </ModalButtonCancel>
          <ModalButtonPrimary 
            onClick={handleConfirmar} 
            isLoading={isSubmitting}
            disabled={!isFormValid}
          >
            <Upload className="w-4 h-4 mr-2" />
            Cargar Evidencia {archivos.length > 0 && `(${archivos.length})`}
          </ModalButtonPrimary>
        </ModalButtonGroup>
      }
    >
      <div className="space-y-6">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* ETAPA Y TIPO */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Etapa del Proceso *
            </label>
            <select
              value={etapaSeleccionada}
              onChange={(e) => setEtapaSeleccionada(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ETAPAS_DISPONIBLES.map(etapa => (
                <option key={etapa} value={etapa}>{etapa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Tipo de Documento *
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {TIPOS_DOCUMENTO.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* NOMBRE DE LA EVIDENCIA */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block mb-2 text-sm font-bold text-gray-700">
            Nombre de la Evidencia *
          </label>
          <input
            type="text"
            value={nombreEvidencia}
            onChange={(e) => setNombreEvidencia(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: Declaración Testigo Principal, Oficio Respuesta..."
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex items-start gap-2 mt-2">
            <Info className="w-4 h-4 flex-shrink-0 text-gray-500 mt-0.5" />
            <p className="text-xs text-gray-600">
              Este nombre identificará la evidencia en el Expediente Electrónico y la Hoja de Control
            </p>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* DESCRIPCIÓN DETALLADA */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block mb-2 text-sm font-bold text-gray-700">
            Descripción Detallada (Opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={isSubmitting}
            placeholder="Descripción detallada del contenido, contexto y relevancia de esta evidencia..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex items-start gap-2 mt-2">
            <Info className="w-4 h-4 flex-shrink-0 text-gray-500 mt-0.5" />
            <p className="text-xs text-gray-600">
              Proporciona contexto adicional sobre el contenido y la relevancia probatoria
            </p>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* ÁREA DE DRAG & DROP */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div>
          <label className="block mb-2 text-sm font-bold text-gray-700">
            Archivos *
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-blue-600 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Arrastra y suelta archivos aquí
                </p>
                <p className="text-xs text-gray-600">
                  o haz clic para seleccionar
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4" />
                <span>PDF, Word, Excel, Imágenes (máx. 10 MB)</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={isSubmitting}
              className="hidden"
            />
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* NOTA INFORMATIVA */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-700" />
            <div className="text-xs text-blue-800">
              <p className="font-bold mb-1.5">Esta evidencia será registrada en:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li><strong>Expediente Electrónico:</strong> Con fecha y hora de incorporación</li>
                <li><strong>Hoja de Control:</strong> Índice electrónico con 10 campos estándar</li>
                <li><strong>Sistema de Trazabilidad:</strong> Registro de usuario y acciones</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* LISTA DE ARCHIVOS SELECCIONADOS */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

        {archivos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">
                Archivos Seleccionados
              </p>
              <Badge className="bg-blue-100 text-blue-800">
                {archivos.length} {archivos.length === 1 ? 'archivo' : 'archivos'}
              </Badge>
            </div>
            <div className="space-y-2">
              {archivos.map((archivo, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getIconoArchivo(archivo.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {archivo.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(archivo.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarArchivo(index);
                    }}
                    disabled={isSubmitting}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
