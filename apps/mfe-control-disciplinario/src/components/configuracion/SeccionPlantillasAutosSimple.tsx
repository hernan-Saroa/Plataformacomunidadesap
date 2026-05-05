/**
 * SECCIÓN PLANTILLAS DE AUTOS - Versión SIMPLE y USABLE
 * Permite subir plantillas Word/PDF y asignarlas a tipos de autos
 * ✅ Usabilidad alta - Flujo simplificado
 * ✅ Diseño corporativo ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Download, Trash2, FileText, X, Plus, File, 
  AlertCircle, CheckCircle, Edit2, Save
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TIPOS ============

export interface PlantillaAuto {
  id: string;
  nombre: string;
  tipoAuto: string; // A qué tipo de auto pertenece
  archivo: {
    nombre: string;
    tipo: string; // .doc, .docx, .pdf
    tamano: number;
    url: string;
  };
  descripcion: string;
  activo: boolean;
  fechaCreacion: string;
}

interface SeccionPlantillasAutosSimpleProps {
  plantillas: PlantillaAuto[];
  tiposAutosDisponibles: Array<{ id: string; nombre: string }>;
  onAgregarPlantilla: (plantilla: Omit<PlantillaAuto, 'id' | 'fechaCreacion'>) => void;
  onEliminarPlantilla: (id: string) => void;
  onToggleActivo: (id: string, activo: boolean) => void;
}

export function SeccionPlantillasAutosSimple({
  plantillas,
  tiposAutosDisponibles,
  onAgregarPlantilla,
  onEliminarPlantilla,
  onToggleActivo
}: SeccionPlantillasAutosSimpleProps) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipoAuto: '',
    descripcion: '',
    archivoNombre: '',
    archivoTipo: '',
    archivoUrl: ''
  });

  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo de archivo
    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (!['doc', 'docx', 'pdf'].includes(extension || '')) {
      toast.error('Archivo no válido', {
        description: 'Solo se permiten archivos .doc, .docx o .pdf'
      });
      return;
    }

    setArchivoSeleccionado(archivo);
    setFormData({
      ...formData,
      archivoNombre: archivo.name,
      archivoTipo: `.${extension}`,
      // En producción real, aquí subirías el archivo y obtendrías la URL
      archivoUrl: URL.createObjectURL(archivo)
    });

    toast.success('Archivo cargado', {
      description: archivo.name
    });
  };

  const handleGuardar = () => {
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!formData.tipoAuto) {
      toast.error('Debes seleccionar un tipo de auto');
      return;
    }
    if (!archivoSeleccionado) {
      toast.error('Debes seleccionar un archivo');
      return;
    }

    const nuevaPlantilla: Omit<PlantillaAuto, 'id' | 'fechaCreacion'> = {
      nombre: formData.nombre.trim(),
      tipoAuto: formData.tipoAuto,
      archivo: {
        nombre: formData.archivoNombre,
        tipo: formData.archivoTipo,
        tamano: archivoSeleccionado.size,
        url: formData.archivoUrl
      },
      descripcion: formData.descripcion.trim(),
      activo: true
    };

    onAgregarPlantilla(nuevaPlantilla);

    // Reset form
    setFormData({
      nombre: '',
      tipoAuto: '',
      descripcion: '',
      archivoNombre: '',
      archivoTipo: '',
      archivoUrl: ''
    });
    setArchivoSeleccionado(null);
    setMostrarModal(false);

    toast.success('Plantilla agregada correctamente', {
      description: nuevaPlantilla.nombre
    });
  };

  const handleDescargar = (plantilla: PlantillaAuto) => {
    const link = document.createElement('a');
    link.href = plantilla.archivo.url;
    link.download = plantilla.archivo.nombre;
    link.click();

    toast.success('Plantilla descargada', {
      description: plantilla.archivo.nombre
    });
  };

  const plantillasFiltradas = filtroTipo === 'todos'
    ? plantillas
    : plantillas.filter(p => p.tipoAuto === filtroTipo);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <File className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Plantillas de Autos
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Sube plantillas Word/PDF y asígnalas a tipos de autos
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setMostrarModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Plus className="w-4 h-4" />
              Subir Plantilla
            </button>
          </div>

          {/* Mensaje informativo */}
          <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-3 rounded">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-semibold mb-1">¿Cómo funciona?</p>
                <ol className="list-decimal list-inside space-y-0.5 text-xs">
                  <li>Sube una plantilla Word o PDF</li>
                  <li>Asígnala a un tipo de auto (ej: "Auto de Apertura")</li>
                  <li>En el módulo de Procesos, descarga la plantilla cuando la necesites</li>
                  <li>Llénala en tu PC y súbela diligenciada al proceso</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filtroTipo === 'todos'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({plantillas.length})
            </button>
            
            {tiposAutosDisponibles.map((tipo) => {
              const count = plantillas.filter(p => p.tipoAuto === tipo.id).length;
              if (count === 0) return null;
              
              return (
                <button
                  key={tipo.id}
                  onClick={() => setFiltroTipo(tipo.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    filtroTipo === tipo.id
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                      : 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {tipo.nombre} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Plantillas */}
        <div className="p-5">
          {plantillasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-600 mb-2">
                No hay plantillas configuradas
              </p>
              <button
                onClick={() => setMostrarModal(true)}
                className="text-sm text-green-600 hover:text-green-700 font-semibold"
              >
                Subir primera plantilla
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {plantillasFiltradas.map((plantilla) => {
                const tipoAuto = tiposAutosDisponibles.find(t => t.id === plantilla.tipoAuto);
                
                return (
                  <div 
                    key={plantilla.id} 
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-300 transition-all bg-gradient-to-br from-green-50/50 to-white"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-gray-900 mb-1">
                              {plantilla.nombre}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                                {tipoAuto?.nombre || 'Sin asignar'}
                              </span>
                              <span>•</span>
                              <span className="font-medium">{plantilla.archivo.nombre}</span>
                              <span>•</span>
                              <span>{formatBytes(plantilla.archivo.tamano)}</span>
                            </div>
                            {plantilla.descripcion && (
                              <p className="text-xs text-gray-600 mt-1">
                                {plantilla.descripcion}
                              </p>
                            )}
                          </div>

                          {/* Estado */}
                          <button
                            onClick={() => onToggleActivo(plantilla.id, !plantilla.activo)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                              plantilla.activo ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            title={plantilla.activo ? 'Activo' : 'Inactivo'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                plantilla.activo ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDescargar(plantilla)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-xs font-semibold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Descargar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
                                onEliminarPlantilla(plantilla.id);
                                toast.success('Plantilla eliminada');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border-2 border-red-200 text-red-700 hover:bg-red-100 transition-colors text-xs font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Subir Plantilla */}
      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div 
                className="px-5 py-4 flex items-center justify-between text-white"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <div>
                  <h3 className="text-lg font-bold">Subir Plantilla</h3>
                  <p className="text-sm mt-0.5 text-green-100">
                    Sube un archivo Word o PDF y asígnalo a un tipo de auto
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nombre de la Plantilla <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Ej: Auto de Apertura - Formato Estándar"
                    />
                  </div>

                  {/* Tipo de Auto */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Auto <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.tipoAuto}
                      onChange={(e) => setFormData({ ...formData, tipoAuto: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                      <option value="">Selecciona un tipo de auto...</option>
                      {tiposAutosDisponibles.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                      placeholder="Breve descripción de cuándo usar esta plantilla..."
                    />
                  </div>

                  {/* Archivo */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Archivo <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                      <input
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={handleSeleccionarArchivo}
                        className="hidden"
                        id="archivo-input"
                      />
                      <label
                        htmlFor="archivo-input"
                        className="cursor-pointer"
                      >
                        {archivoSeleccionado ? (
                          <div>
                            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {archivoSeleccionado.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatBytes(archivoSeleccionado.size)}
                            </p>
                            <button
                              type="button"
                              className="mt-2 text-xs text-green-600 hover:text-green-700 font-semibold"
                            >
                              Cambiar archivo
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              Haz clic para seleccionar archivo
                            </p>
                            <p className="text-xs text-gray-600">
                              Formatos: .doc, .docx, .pdf
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <Save className="w-4 h-4" />
                  Guardar Plantilla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
