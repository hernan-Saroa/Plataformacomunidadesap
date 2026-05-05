/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL: GESTIÓN DE EVIDENCIAS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Permite a los auditores cargar, visualizar y eliminar evidencias que 
 * respalden el avance de las actividades del Plan Anual.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, FileText, Download, Trash2, Eye,
  CheckCircle2, AlertCircle, Calendar, User, File
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface Evidencia {
  id: string;
  nombre: string;
  url: string;
  tipo: string; // 'pdf', 'docx', 'xlsx', 'jpg', etc.
  tamaño: number; // en bytes
  fechaCarga: string;
  cargadoPor: string;
  descripcion: string;
}

interface ModalGestionEvidenciasProps {
  isOpen: boolean;
  onClose: () => void;
  actividadNombre: string;
  evidencias: Evidencia[];
  onAgregarEvidencia: (evidencia: Omit<Evidencia, 'id'>) => void;
  onEliminarEvidencia: (evidenciaId: string) => void;
  responsableNombre: string;
  porcentajeAvance: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatearTamaño = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const obtenerIconoPorTipo = (tipo: string) => {
  const iconos: Record<string, JSX.Element> = {
    pdf: <FileText className="w-5 h-5 text-red-600" />,
    docx: <FileText className="w-5 h-5 text-blue-600" />,
    doc: <FileText className="w-5 h-5 text-blue-600" />,
    xlsx: <FileText className="w-5 h-5 text-green-600" />,
    xls: <FileText className="w-5 h-5 text-green-600" />,
    jpg: <FileText className="w-5 h-5 text-purple-600" />,
    jpeg: <FileText className="w-5 h-5 text-purple-600" />,
    png: <FileText className="w-5 h-5 text-purple-600" />
  };
  return iconos[tipo.toLowerCase()] || <File className="w-5 h-5 text-gray-600" />;
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ModalGestionEvidencias({
  isOpen,
  onClose,
  actividadNombre,
  evidencias,
  onAgregarEvidencia,
  onEliminarEvidencia,
  responsableNombre,
  porcentajeAvance
}: ModalGestionEvidenciasProps) {
  const [descripcionNuevaEvidencia, setDescripcionNuevaEvidencia] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  if (!isOpen) return null;

  // Handler: Simular carga de archivo
  const handleCargarArchivo = (file: File) => {
    const nuevaEvidencia: Omit<Evidencia, 'id'> = {
      nombre: file.name,
      url: URL.createObjectURL(file), // Mock URL
      tipo: file.name.split('.').pop() || 'file',
      tamaño: file.size,
      fechaCarga: new Date().toISOString(),
      cargadoPor: responsableNombre,
      descripcion: descripcionNuevaEvidencia || 'Sin descripción'
    };

    onAgregarEvidencia(nuevaEvidencia);
    setDescripcionNuevaEvidencia('');
    toast.success('✅ Evidencia cargada', {
      description: `${file.name} se agregó correctamente`
    });
  };

  // Handler: Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleCargarArchivo(file));
  };

  // Handler: Input file
  const handleInputFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => handleCargarArchivo(file));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Gestión de Evidencias</h2>
              <p className="text-blue-100 text-sm mt-1">{actividadNombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Info de la actividad */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-blue-600 uppercase">Responsable</p>
              </div>
              <p className="font-semibold text-gray-900">{responsableNombre}</p>
            </div>
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-xs font-semibold text-green-600 uppercase">Avance</p>
              </div>
              <p className="font-bold text-2xl text-green-900">{porcentajeAvance}%</p>
            </div>
          </div>

          {/* Zona de carga */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Cargar Nueva Evidencia</h3>
            
            {/* Descripción */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción de la evidencia (opcional)
              </label>
              <input
                type="text"
                value={descripcionNuevaEvidencia}
                onChange={(e) => setDescripcionNuevaEvidencia(e.target.value)}
                placeholder="Ej: Acta de reunión, informe preliminar, fotografías..."
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-xl p-8 text-center transition-all ${
                arrastrando
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-3 ${arrastrando ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-gray-700 font-semibold mb-2">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mb-4">
                PDF, Word, Excel, imágenes (máx. 10MB)
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleInputFile}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2 transition-colors">
                  <Upload className="w-4 h-4" />
                  Seleccionar Archivos
                </span>
              </label>
            </div>
          </div>

          {/* Lista de evidencias */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center justify-between">
              <span>Evidencias Cargadas ({evidencias.length})</span>
              {evidencias.length > 0 && (
                <span className="text-sm text-gray-500 font-normal">
                  Total: {formatearTamaño(evidencias.reduce((sum, e) => sum + e.tamaño, 0))}
                </span>
              )}
            </h3>

            {evidencias.length === 0 ? (
              <div className="p-8 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay evidencias cargadas</p>
                <p className="text-sm text-gray-500 mt-1">
                  Carga documentos que respalden el avance de esta actividad
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {evidencias.map((evidencia) => (
                  <div
                    key={evidencia.id}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icono del archivo */}
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {obtenerIconoPorTipo(evidencia.tipo)}
                      </div>

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 truncate">
                          {evidencia.nombre}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{evidencia.descripcion}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(evidencia.fechaCarga).toLocaleDateString('es-CO')}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {evidencia.cargadoPor}
                          </div>
                          <div className="flex items-center gap-1">
                            <File className="w-3 h-3" />
                            {formatearTamaño(evidencia.tamaño)}
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            window.open(evidencia.url, '_blank');
                            toast.info('Abriendo archivo...');
                          }}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button
                          onClick={() => {
                            onEliminarEvidencia(evidencia.id);
                            toast.success('Evidencia eliminada');
                          }}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <strong>Nota:</strong> Las evidencias respaldan el cumplimiento de las actividades del Plan Anual
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
