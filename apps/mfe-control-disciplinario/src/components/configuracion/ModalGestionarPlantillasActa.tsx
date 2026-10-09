/**
 * MODAL GESTIONAR PLANTILLAS ACTA
 * Sistema completo para gestionar plantillas de un tipo de acta
 * ✅ Agregar, Editar, Eliminar plantillas
 * ✅ Drag & Drop de archivos (.docx, .doc, .dotx, .rtf, .pdf)
 * ✅ Versión y estado de plantillas
 * ✅ Subir archivos al backend
 * ✅ Diseño corporativo ESAP Desktop-First
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Upload, File as FileIcon, Download, Trash2, Edit2, Plus, AlertCircle, 
  Save, Loader2, Files, Clock, Info, CheckCircle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import disciplinaryService from '../../../../services/api/disciplinary.service';
import type { TipoActa, PlantillaArchivo } from './SeccionPlantillasActasUnificada';
import { ModalVisorPlantilla } from './ModalVisorPlantilla';

interface ModalGestionarPlantillasActaProps {
  tipoActa: TipoActa;
  onGuardar: (plantillas: PlantillaArchivo[]) => void;
  onCerrar: () => void;
}

export function ModalGestionarPlantillasActa({ 
  tipoActa, 
  onGuardar, 
  onCerrar 
}: ModalGestionarPlantillasActaProps) {
  // Inicializar plantillas desde tipoActa.plantillas o tipoActa.plantilla
  const [plantillas, setPlantillas] = useState<PlantillaArchivo[]>(() => {
    if (tipoActa.plantillas && tipoActa.plantillas.length > 0) {
      return tipoActa.plantillas;
    }
    if (tipoActa.plantilla) {
      return [tipoActa.plantilla];
    }
    return [];
  });
  
  const [modalAgregarPlantilla, setModalAgregarPlantilla] = useState(false);
  const [plantillaEditando, setPlantillaEditando] = useState<PlantillaArchivo | null>(null);
  const [plantillaParaVer, setPlantillaParaVer] = useState<PlantillaArchivo | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Actualizar plantillas cuando cambie tipoActa
  useEffect(() => {
    if (tipoActa.plantillas && tipoActa.plantillas.length > 0) {
      setPlantillas(tipoActa.plantillas);
    } else if (tipoActa.plantilla) {
      setPlantillas([tipoActa.plantilla]);
    } else {
      setPlantillas([]);
    }
  }, [tipoActa]);

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
    if (!plantilla.url) {
      toast.error('No hay archivo para descargar');
      return;
    }
    
    // Si es una URL relativa, usar el servicio de descarga
    if (plantilla.url.startsWith('/') || !plantilla.url.startsWith('http')) {
      disciplinaryService.downloadFileFromUrl(plantilla.url, plantilla.nombreArchivo)
        .then(() => {
          toast.success('Plantilla descargada', {
            description: plantilla.nombreArchivo
          });
        })
        .catch((error) => {
          console.error('Error descargando:', error);
          const link = document.createElement('a');
          link.href = plantilla.url;
          link.download = plantilla.nombreArchivo;
          link.click();
        });
    } else {
      const link = document.createElement('a');
      link.href = plantilla.url;
      link.download = plantilla.nombreArchivo;
      link.click();
      toast.success('Plantilla descargada', {
        description: plantilla.nombreArchivo
      });
    }
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
    setGuardando(true);
    try {
      // Subir archivo al backend para las plantillas que tengan archivo nuevo
      for (const plantilla of plantillas) {
        if (plantilla.file || (plantilla.url && plantilla.url.startsWith('blob:'))) {
          try {
            let fileToUpload = plantilla.file;
            if (!fileToUpload && plantilla.url) {
              const response = await fetch(plantilla.url);
              const blob = await response.blob();
              const fileName = plantilla.nombreArchivo || 'plantilla.docx';
              const fileType = blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              fileToUpload = new globalThis.File([blob], fileName, { type: fileType });
            }

            if (fileToUpload && tipoActa.id && !tipoActa.id.startsWith('tipo-acta-')) {
              const uploadedData = await disciplinaryService.uploadActaPlantilla(
                tipoActa.id,
                fileToUpload,
                plantilla.nombre,
                plantilla.descripcion,
                plantilla.version,
                plantilla.activo ? 'activo' : 'inactivo'
              );
              
              plantilla.url = uploadedData.plantilla || (uploadedData as any)?.data?.plantilla || plantilla.url;
              plantilla.nombre = uploadedData.nombre_plantilla || (uploadedData as any)?.data?.nombre_plantilla || plantilla.nombre;
              plantilla.nombreArchivo = fileToUpload.name;
              (plantilla as any).yaSincronizado = true;
              plantilla.file = undefined;
            }
          } catch (uploadError) {
            console.error('Error subiendo archivo de plantilla de acta:', uploadError);
            toast.error('Error al subir el archivo de plantilla');
            throw uploadError;
          }
        }
      }
      
      await onGuardar(plantillas);
      toast.success('Cambios guardados', {
        description: `${plantillas.length} plantilla(s) configurada(s)`
      });
      onCerrar();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar cambios de plantilla');
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

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 1000 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div 
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            >
              <div>
                <h3 className="text-lg font-bold">
                  Gestionar Plantillas
                </h3>
                <p className="text-sm mt-0.5 text-amber-100">
                  {tipoActa.nombre} · {plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={onCerrar}
                disabled={guardando}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {/* Información del Tipo de Acta */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900">
                      <p className="font-semibold mb-1">Sobre este tipo de acta:</p>
                      <p>{tipoActa.descripcion || 'Sin descripción detallada.'}</p>
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
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Plantilla
                  </button>
                </div>

                {/* Lista de Plantillas */}
                {plantillas.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Files className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">
                      No hay plantillas configuradas
                    </h5>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                      Agrega una plantilla de Word (.docx) o PDF para este tipo de acta.
                    </p>
                    <button
                      onClick={() => setModalAgregarPlantilla(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Primera Plantilla
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {plantillas.map((plantilla) => (
                      <div
                        key={plantilla.id}
                        className={`bg-white border rounded-lg p-4 transition-all hover:shadow-md ${
                          plantilla.activo ? 'border-gray-200' : 'border-gray-200 bg-gray-50/50 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Info de la Plantilla */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 flex-shrink-0">
                              <FileIcon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h5 className="text-sm font-bold text-gray-900 truncate">
                                  {plantilla.nombre}
                                </h5>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  v{plantilla.version}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  plantilla.activo 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}>
                                  {plantilla.activo ? 'Activa' : 'Inactiva'}
                                </span>
                                {(plantilla.file || (plantilla.url && plantilla.url.startsWith('blob:'))) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                    Nuevo archivo pendiente
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {plantilla.descripcion || 'Sin descripción'}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="truncate max-w-xs font-medium text-gray-700">
                                  📄 {plantilla.nombreArchivo || 'Archivo de plantilla'}
                                </span>
                                {plantilla.tamano > 0 && (
                                  <span>{formatBytes(plantilla.tamano)}</span>
                                )}
                                {plantilla.fechaModificacion && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(plantilla.fechaModificacion).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Toggle Activo */}
                            <button
                              onClick={() => handleToggleActivoPlantilla(plantilla.id)}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                plantilla.activo 
                                  ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                                  : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                              }`}
                              title={plantilla.activo ? 'Desactivar plantilla' : 'Activar plantilla'}
                            >
                              {plantilla.activo ? 'Activa' : 'Inactiva'}
                            </button>

                            {/* Previsualizar */}
                            {(plantilla.url || plantilla.file) && (
                              <button
                                onClick={() => setPlantillaParaVer(plantilla)}
                                className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
                                title="Previsualizar plantilla"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {/* Descargar */}
                            {(plantilla.url || plantilla.file) && (
                              <button
                                onClick={() => handleDescargarPlantilla(plantilla)}
                                className="p-1.5 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
                                title="Descargar plantilla"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}

                            {/* Editar */}
                            <button
                              onClick={() => setPlantillaEditando(plantilla)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Editar información"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => handleEliminarPlantilla(plantilla.id)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar plantilla"
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
            <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {plantillas.filter(p => p.activo).length} de {plantillas.length} plantilla(s) activa(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={onCerrar}
                  disabled={guardando}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCambios}
                  disabled={guardando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Modal Formulario (Agregar/Editar) */}
      <ModalFormularioPlantillaActa
        isOpen={modalAgregarPlantilla || !!plantillaEditando}
        plantillaEdicion={plantillaEditando}
        onClose={() => {
          setModalAgregarPlantilla(false);
          setPlantillaEditando(null);
        }}
        onGuardar={(plantillaData) => {
          if (plantillaEditando) {
            handleEditarPlantilla({
              ...plantillaEditando,
              ...plantillaData
            });
          } else {
            handleAgregarPlantilla(plantillaData);
          }
          setModalAgregarPlantilla(false);
          setPlantillaEditando(null);
        }}
      />

      {/* Modal Visor de Plantilla */}
      {plantillaParaVer && (
        <ModalVisorPlantilla
          isOpen={!!plantillaParaVer}
          onClose={() => setPlantillaParaVer(null)}
          titulo={tipoActa.nombre}
          subtitulo={`Plantilla: ${plantillaParaVer.nombre}`}
          descripcion={plantillaParaVer.descripcion || tipoActa.descripcion}
          tipoPlantilla="acta"
          plantillas={[plantillaParaVer]}
          colorTema="#F59E0B"
        />
      )}
    </>
  );
}

// Subcomponente Formulario Plantilla
interface ModalFormularioPlantillaActaProps {
  isOpen: boolean;
  plantillaEdicion: PlantillaArchivo | null;
  onClose: () => void;
  onGuardar: (plantilla: Omit<PlantillaArchivo, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => void;
}

function ModalFormularioPlantillaActa({
  isOpen,
  plantillaEdicion,
  onClose,
  onGuardar
}: ModalFormularioPlantillaActaProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    version: '1.0',
    activo: true
  });

  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoExistente, setArchivoExistente] = useState<{
    nombre: string;
    url: string;
    tamano: number;
  } | null>(null);

  const [dragging, setDragging] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (plantillaEdicion) {
      setFormData({
        nombre: plantillaEdicion.nombre,
        descripcion: plantillaEdicion.descripcion,
        version: plantillaEdicion.version,
        activo: plantillaEdicion.activo
      });
      if (plantillaEdicion.url) {
        setArchivoExistente({
          nombre: plantillaEdicion.nombreArchivo,
          url: plantillaEdicion.url,
          tamano: plantillaEdicion.tamano
        });
      }
      setArchivo(plantillaEdicion.file || null);
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        version: '1.0',
        activo: true
      });
      setArchivo(null);
      setArchivoExistente(null);
    }
    setErrores({});
  }, [plantillaEdicion, isOpen]);

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
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
    const extensionesPermitidas = ['.doc', '.docx', '.dotx', '.rtf', '.pdf'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!extensionesPermitidas.includes(extension)) {
      toast.error('Formato no permitido', {
        description: 'Solo se permiten archivos Word (.doc, .docx, .dotx, .rtf) o PDF (.pdf)'
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
      await new Promise(resolve => setTimeout(resolve, 300));

      const plantilla: Omit<PlantillaArchivo, 'id' | 'fechaCreacion' | 'fechaModificacion'> = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        nombreArchivo: archivo ? archivo.name : archivoExistente?.nombre || '',
        url: archivo ? URL.createObjectURL(archivo) : archivoExistente?.url || '',
        tamano: archivo ? archivo.size : archivoExistente?.tamano || 0,
        version: formData.version.trim(),
        activo: formData.activo,
        file: archivo || undefined
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 1001 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between text-white"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
          >
            <div>
              <h3 className="text-lg font-bold">
                {plantillaEdicion ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              <p className="text-sm mt-0.5 text-amber-100">
                Configura el archivo de plantilla Word o PDF
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

          {/* Formulario */}
          <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  NOMBRE DE LA PLANTILLA <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Acta de Versión Libre y Espontánea"
                  className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${
                    errores.nombre 
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                  }`}
                />
                {errores.nombre && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errores.nombre}
                  </p>
                )}
              </div>

              {/* Versión y Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    VERSIÓN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0"
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${
                      errores.version 
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                    }`}
                  />
                  {errores.version && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errores.version}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ESTADO
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      Plantilla activa
                    </span>
                  </label>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  DESCRIPCIÓN
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe el propósito y uso de esta plantilla..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none"
                />
              </div>

              {/* Upload de Archivo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ARCHIVO DE PLANTILLA {!plantillaEdicion && <span className="text-red-500">*</span>}
                </label>

                {/* Archivo cargado */}
                {(archivo || archivoExistente) ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {archivo ? archivo.name : archivoExistente?.nombre}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {archivo 
                              ? formatBytes(archivo.size)
                              : archivoExistente 
                              ? formatBytes(archivoExistente.tamano)
                              : ''} · Listo para vincular
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={eliminarArchivo}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dropzone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      dragging
                        ? 'border-amber-500 bg-amber-50'
                        : errores.archivo
                        ? 'border-red-300 bg-red-50/50 hover:border-red-400'
                        : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".doc,.docx,.dotx,.rtf,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <Upload className={`w-8 h-8 mx-auto mb-2 ${
                      dragging ? 'text-amber-500' : 'text-gray-400'
                    }`} />

                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Haz clic para subir o arrastra un archivo aquí
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Archivos Word (.docx, .doc, .dotx, .rtf) o PDF (.pdf) hasta 10 MB
                    </p>
                  </div>
                )}

                {errores.archivo && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errores.archivo}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
              style={{ 
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
              }}
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {plantillaEdicion ? 'Actualizar Plantilla' : 'Agregar Plantilla'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
