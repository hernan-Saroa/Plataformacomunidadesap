/**
 * MODAL GESTIONAR PLANTILLAS - Configuración
 * Sistema completo para gestionar MÚLTIPLES plantillas por tipo de auto
 * ✅ Agregar, Editar, Eliminar plantillas
 * ✅ Drag & Drop de archivos
 * ✅ Versión y estado de plantillas
 * ✅ Diseño corporativo ESAP Desktop-First
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Upload, File, Download, Trash2, Edit2, Plus, AlertCircle, 
  CheckCircle, Info, Save, Loader, Files, Clock, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { type TipoAuto, type PlantillaArchivo } from './SeccionAutosProvidencias';

interface ModalGestionarPlantillasProps {
  isOpen: boolean;
  onClose: () => void;
  tipoAuto: TipoAuto | null;
  onActualizarPlantillas: (tipoAutoId: string, plantillas: PlantillaArchivo[]) => void;
}

export function ModalGestionarPlantillas({ 
  isOpen, 
  onClose, 
  tipoAuto,
  onActualizarPlantillas
}: ModalGestionarPlantillasProps) {
  const [plantillas, setPlantillas] = useState<PlantillaArchivo[]>(tipoAuto?.plantillas || []);
  const [modalAgregarPlantilla, setModalAgregarPlantilla] = useState(false);
  const [plantillaEditando, setPlantillaEditando] = useState<PlantillaArchivo | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Actualizar plantillas cuando cambie tipoAuto
  useState(() => {
    if (tipoAuto) {
      setPlantillas(tipoAuto.plantillas);
    }
  });

  const handleToggleActivoPlantilla = (plantillaId: string) => {
    setPlantillas(prev => prev.map(p => 
      p.id === plantillaId ? { ...p, activo: !p.activo } : p
    ));
  };

  const handleEliminarPlantilla = (plantillaId: string) => {
    const plantilla = plantillas.find(p => p.id === plantillaId);
    if (!plantilla) return;

    if (confirm(`¿Estás seguro de eliminar la plantilla "${plantilla.nombre}"?`)) {
      setPlantillas(prev => prev.filter(p => p.id !== plantillaId));
      toast.success('Plantilla eliminada', {
        description: plantilla.nombre
      });
    }
  };

  const handleDescargarPlantilla = (plantilla: PlantillaArchivo) => {
    const link = document.createElement('a');
    link.href = plantilla.url;
    link.download = plantilla.nombreArchivo;
    link.click();
    
    toast.success('Plantilla descargada', {
      description: plantilla.nombreArchivo
    });
  };

  const handleAgregarPlantilla = (nuevaPlantilla: Omit<PlantillaArchivo, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    const plantilla: PlantillaArchivo = {
      ...nuevaPlantilla,
      id: `plantilla-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };

    setPlantillas(prev => [...prev, plantilla]);
    toast.success('Plantilla agregada', {
      description: plantilla.nombre
    });
  };

  const handleEditarPlantilla = (plantillaEditada: PlantillaArchivo) => {
    setPlantillas(prev => prev.map(p => 
      p.id === plantillaEditada.id 
        ? { ...plantillaEditada, fechaModificacion: new Date().toISOString() }
        : p
    ));
    toast.success('Plantilla actualizada', {
      description: plantillaEditada.nombre
    });
  };

  const handleGuardarCambios = async () => {
    if (!tipoAuto) return;

    setGuardando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      onActualizarPlantillas(tipoAuto.id, plantillas);
      toast.success('Cambios guardados', {
        description: `${plantillas.length} plantilla(s) configurada(s)`
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen || !tipoAuto) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div 
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
            >
              <div>
                <h3 className="text-lg font-bold">
                  Gestionar Plantillas
                </h3>
                <p className="text-sm mt-0.5 text-purple-100">
                  {tipoAuto.nombre} · {plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={guardando}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {/* Información del Tipo de Auto */}
                <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-900">
                      <p className="font-semibold mb-1">Sobre este tipo de auto:</p>
                      <p>{tipoAuto.descripcion}</p>
                    </div>
                  </div>
                </div>

                {/* Botón Agregar Plantilla */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">
                    PLANTILLAS CONFIGURADAS ({plantillas.length})
                  </h4>
                  <button
                    onClick={() => setModalAgregarPlantilla(true)}
                    disabled={guardando}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
                    style={{ 
                      background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                      boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Plantilla
                  </button>
                </div>

                {/* Lista de Plantillas */}
                {plantillas.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <Files className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-3">
                      No hay plantillas configuradas para este tipo de auto
                    </p>
                    <button
                      onClick={() => setModalAgregarPlantilla(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Agregar primera plantilla
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plantillas
                      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
                      .map((plantilla) => (
                        <div 
                          key={plantilla.id} 
                          className={`bg-white border-2 rounded-lg p-4 transition-all ${
                            plantilla.activo 
                              ? 'border-gray-200 hover:border-blue-300 hover:shadow-md' 
                              : 'border-gray-200 bg-gray-50 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Ícono */}
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              plantilla.activo ? 'bg-blue-100' : 'bg-gray-200'
                            }`}>
                              <File className={`w-6 h-6 ${plantilla.activo ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>

                            {/* Información */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h5 className="text-sm font-bold text-gray-900 truncate">
                                  {plantilla.nombre}
                                </h5>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                  plantilla.activo 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {plantilla.activo ? 'ACTIVA' : 'INACTIVA'}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                  v{plantilla.version}
                                </span>
                              </div>

                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {plantilla.descripcion}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="font-medium">{plantilla.nombreArchivo}</span>
                                <span>•</span>
                                <span>{formatBytes(plantilla.tamano)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(plantilla.fechaCreacion).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleToggleActivoPlantilla(plantilla.id)}
                                disabled={guardando}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                  plantilla.activo ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                title={plantilla.activo ? 'Desactivar' : 'Activar'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    plantilla.activo ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>

                              <button
                                onClick={() => handleDescargarPlantilla(plantilla)}
                                disabled={guardando}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setPlantillaEditando(plantilla);
                                  setModalAgregarPlantilla(true);
                                }}
                                disabled={guardando}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors disabled:opacity-50"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleEliminarPlantilla(plantilla.id)}
                                disabled={guardando}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
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
            <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                <span className="font-semibold">{plantillas.filter(p => p.activo).length}</span> plantilla(s) activa(s) de <span className="font-semibold">{plantillas.length}</span> total
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onClose}
                  disabled={guardando}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCambios}
                  disabled={guardando}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
                  style={{ 
                    background: guardando ? '#9CA3AF' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    boxShadow: guardando ? 'none' : '0 2px 4px rgba(139, 92, 246, 0.2)'
                  }}
                >
                  {guardando ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Modal Agregar/Editar Plantilla */}
      {modalAgregarPlantilla && (
        <ModalFormularioPlantilla
          isOpen={modalAgregarPlantilla}
          onClose={() => {
            setModalAgregarPlantilla(false);
            setPlantillaEditando(null);
          }}
          onGuardar={(plantilla) => {
            if (plantillaEditando) {
              handleEditarPlantilla({ ...plantilla, id: plantillaEditando.id } as PlantillaArchivo);
            } else {
              handleAgregarPlantilla(plantilla);
            }
            setModalAgregarPlantilla(false);
            setPlantillaEditando(null);
          }}
          plantillaEdicion={plantillaEditando}
        />
      )}
    </>
  );
}

// ============ MODAL FORMULARIO PLANTILLA ============

interface ModalFormularioPlantillaProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (plantilla: Omit<PlantillaArchivo, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => void;
  plantillaEdicion?: PlantillaArchivo | null;
}

function ModalFormularioPlantilla({ 
  isOpen, 
  onClose, 
  onGuardar, 
  plantillaEdicion 
}: ModalFormularioPlantillaProps) {
  const [formData, setFormData] = useState({
    nombre: plantillaEdicion?.nombre || '',
    descripcion: plantillaEdicion?.descripcion || '',
    version: plantillaEdicion?.version || '1.0',
    activo: plantillaEdicion?.activo ?? true
  });

  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoExistente, setArchivoExistente] = useState<{
    nombre: string;
    url: string;
    tamano: number;
  } | null>(
    plantillaEdicion ? {
      nombre: plantillaEdicion.nombreArchivo,
      url: plantillaEdicion.url,
      tamano: plantillaEdicion.tamano
    } : null
  );

  const [dragging, setDragging] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 5) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 5 caracteres';
    }

    if (!formData.descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es obligatoria';
    } else if (formData.descripcion.trim().length < 10) {
      nuevosErrores.descripcion = 'La descripción debe tener al menos 10 caracteres';
    }

    if (!formData.version.trim()) {
      nuevosErrores.version = 'La versión es obligatoria';
    }

    if (!plantillaEdicion && !archivo) {
      nuevosErrores.archivo = 'Debe subir un archivo de plantilla';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    procesarArchivo(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      procesarArchivo(files[0]);
    }
  };

  const procesarArchivo = (file: File) => {
    const extensionesPermitidas = ['.doc', '.docx', '.pdf'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!extensionesPermitidas.includes(extension)) {
      toast.error('Formato no permitido', {
        description: 'Solo se permiten archivos .doc, .docx o .pdf'
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Archivo muy grande', {
        description: 'El archivo no debe superar los 10 MB'
      });
      return;
    }

    setArchivo(file);
    setArchivoExistente(null);
    setErrores(prev => {
      const { archivo, ...rest } = prev;
      return rest;
    });
    
    toast.success('Archivo cargado', {
      description: file.name
    });
  };

  const eliminarArchivo = () => {
    setArchivo(null);
    setArchivoExistente(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGuardar = async () => {
    if (!validarFormulario()) {
      toast.error('Formulario incompleto', {
        description: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    setGuardando(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const plantilla: Omit<PlantillaArchivo, 'id' | 'fechaCreacion' | 'fechaModificacion'> = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        nombreArchivo: archivo ? archivo.name : archivoExistente?.nombre || '',
        url: archivo ? URL.createObjectURL(archivo) : archivoExistente?.url || '',
        tamano: archivo ? archivo.size : archivoExistente?.tamano || 0,
        version: formData.version.trim(),
        activo: formData.activo
      };

      onGuardar(plantilla);
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar', {
        description: 'No se pudo guardar la plantilla'
      });
    } finally {
      setGuardando(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between text-white"
            style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
          >
            <div>
              <h3 className="text-lg font-bold">
                {plantillaEdicion ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              <p className="text-sm mt-0.5 text-blue-100">
                Configura el archivo de plantilla
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={guardando}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
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
                  onChange={(e) => {
                    setFormData({ ...formData, nombre: e.target.value });
                    setErrores(prev => {
                      const { nombre, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    errores.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Auto de Apertura - Versión Actualizada 2024"
                  disabled={guardando}
                />
                {errores.nombre && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.nombre}
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => {
                    setFormData({ ...formData, descripcion: e.target.value });
                    setErrores(prev => {
                      const { descripcion, ...rest } = prev;
                      return rest;
                    });
                  }}
                  rows={3}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none ${
                    errores.descripcion ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe el propósito y uso de esta plantilla..."
                  disabled={guardando}
                />
                {errores.descripcion && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.descripcion}
                  </p>
                )}
              </div>

              {/* Versión */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Versión <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => {
                    setFormData({ ...formData, version: e.target.value });
                    setErrores(prev => {
                      const { version, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    errores.version ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 1.0, 2.1, 3.0"
                  disabled={guardando}
                />
                {errores.version && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.version}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-600 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Usa formato X.Y (Ej: 1.0, 2.3)
                </p>
              </div>

              {/* Subir Archivo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Archivo de Plantilla {!plantillaEdicion && <span className="text-red-500">*</span>}
                </label>
                
                {!archivo && !archivoExistente ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      dragging 
                        ? 'border-blue-500 bg-blue-50' 
                        : errores.archivo
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${
                      dragging ? 'text-blue-500' : errores.archivo ? 'text-red-500' : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Arrastra el archivo aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-600">
                      Formatos permitidos: .doc, .docx, .pdf (Máximo 10 MB)
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <File className="w-8 h-8 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {archivo ? archivo.name : archivoExistente?.nombre}
                        </p>
                        {archivo && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            Tamaño: {formatBytes(archivo.size)}
                          </p>
                        )}
                        {archivoExistente && !archivo && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            Archivo actual ({formatBytes(archivoExistente.tamano)})
                          </p>
                        )}
                      </div>
                      <button
                        onClick={eliminarArchivo}
                        disabled={guardando}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {errores.archivo && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.archivo}
                  </p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Estado de la plantilla
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formData.activo 
                      ? 'Esta plantilla estará disponible para usar' 
                      : 'Esta plantilla no estará disponible'}
                  </p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                  disabled={guardando}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${
                    formData.activo ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      formData.activo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
              style={{ 
                background: guardando ? '#9CA3AF' : 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                boxShadow: guardando ? 'none' : '0 2px 4px rgba(41, 98, 255, 0.2)'
              }}
            >
              {guardando ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {plantillaEdicion ? 'Actualizar' : 'Agregar'} Plantilla
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
