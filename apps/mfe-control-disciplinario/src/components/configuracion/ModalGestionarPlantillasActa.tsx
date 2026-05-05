/**
 * MODAL GESTIONAR PLANTILLAS ACTA
 * Modal para agregar/eliminar plantillas de un tipo de acta
 * ✅ Permite subir archivos .docx al backend
 */

import { useState, useRef } from 'react';
import { X, Save, Plus, Trash2, Upload, FileText, Download, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { TipoActa, PlantillaArchivo } from './SeccionPlantillasActasUnificada';

interface ModalGestionarPlantillasActaProps {
  tipoActa: TipoActa;
  onGuardar: (plantillas: PlantillaArchivo[]) => void;
  onCerrar: () => void;
}

export function ModalGestionarPlantillasActa({ tipoActa, onGuardar, onCerrar }: ModalGestionarPlantillasActaProps) {
  const [plantillas, setPlantillas] = useState<PlantillaArchivo[]>(tipoActa.plantillas || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState<string | null>(null);

  const agregarPlantilla = () => {
    const nuevaPlantilla: PlantillaArchivo = {
      id: `plantilla-${Date.now()}`,
      nombre: 'Nueva Plantilla',
      nombreArchivo: '',
      descripcion: '',
      url: '',
      tamano: 0,
      version: '1.0',
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      activo: true
    };
    setPlantillas([...plantillas, nuevaPlantilla]);
  };

  const eliminarPlantilla = (id: string) => {
    setPlantillas(plantillas.filter(p => p.id !== id));
  };

  const actualizarPlantilla = (id: string, campo: keyof PlantillaArchivo, valor: any) => {
    setPlantillas(plantillas.map(p => 
      p.id === id ? { ...p, [campo]: valor, fechaModificacion: new Date().toISOString() } : p
    ));
  };

  // Manejar selección de archivo
  const handleFileSelect = (plantillaId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Word
    const allowedExtensions = ['.docx', '.doc', '.dotx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos Word (.docx, .doc, .dotx)'
      });
      return;
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', {
        description: 'El archivo no puede superar los 10MB'
      });
      return;
    }

    // Crear URL temporal para el archivo (se usará para subir al backend)
    const blobUrl = URL.createObjectURL(file);
    
    // Actualizar la plantilla con el archivo
    setPlantillas(plantillas.map(p => 
      p.id === plantillaId ? { 
        ...p, 
        nombreArchivo: file.name,
        url: blobUrl, // URL temporal para subir después
        tamano: file.size,
        fechaModificacion: new Date().toISOString() 
      } : p
    ));

    toast.success('Archivo seleccionado correctamente', {
      description: file.name
    });

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Verificar si una plantilla tiene un archivo nuevo (blob URL) que necesita subirse
  const isNewFile = (plantilla: PlantillaArchivo): boolean => {
    return plantilla.url?.startsWith('blob:') || false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que cada plantilla con archivo tenga nombre
    const plantillasConArchivo = plantillas.filter(p => p.url && !isNewFile(p));
    const plantillasSinArchivo = plantillas.filter(p => !p.url);
    
    if (plantillas.length > 0) {
      // Validar que tengan nombre
      const sinNombre = plantillas.some(p => !p.nombre || p.nombre.trim() === '');
      if (sinNombre) {
        toast.error('Todas las plantillas deben tener un nombre');
        return;
      }
    }
    
    onGuardar(plantillas);
    toast.success('Plantillas actualizadas correctamente');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between text-white"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
          >
            <div>
              <h3 className="text-lg font-bold">Gestionar Plantillas</h3>
              <p className="text-sm text-amber-100 mt-0.5">{tipoActa.nombre}</p>
            </div>
            <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            <button
              type="button"
              onClick={agregarPlantilla}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 transition-all font-semibold"
            >
              <Plus className="w-5 h-5" />
              Agregar Nueva Plantilla
            </button>

            {plantillas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No hay plantillas. Haz clic en "Agregar Nueva Plantilla"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plantillas.map((plantilla) => (
                  <div key={plantilla.id} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-900">Plantilla</h4>
                      <button
                        type="button"
                        onClick={() => eliminarPlantilla(plantilla.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Plantilla</label>
                        <input
                          type="text"
                          value={plantilla.nombre}
                          onChange={(e) => actualizarPlantilla(plantilla.id, 'nombre', e.target.value)}
                          placeholder="Ej: Acta de Version Libre"
                          className="w-full px-3 py-2 text-sm border rounded-lg"
                        />
                      </div>

                      {/* Sección de Upload de Archivo */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Archivo Word (.docx)</label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".docx,.doc,.dotx"
                          onChange={(e) => handleFileSelect(plantilla.id, e)}
                          className="hidden"
                          id={`file-input-${plantilla.id}`}
                        />
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`file-input-${plantilla.id}`}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-all text-sm font-medium ${
                              plantilla.url 
                                ? 'border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100'
                                : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:bg-amber-50'
                            }`}
                          >
                            {plantilla.url ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="truncate">{plantilla.nombreArchivo || 'Archivo cargado'}</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Seleccionar archivo</span>
                              </>
                            )}
                          </label>
                          {plantilla.url && (
                            <button
                              type="button"
                              onClick={() => {
                                actualizarPlantilla(plantilla.id, 'url', '');
                                actualizarPlantilla(plantilla.id, 'nombreArchivo', '');
                                actualizarPlantilla(plantilla.id, 'tamano', 0);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Eliminar archivo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {plantilla.url && plantilla.tamano > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Tamaño: {(plantilla.tamano / 1024).toFixed(2)} KB
                          </p>
                        )}
                        {isNewFile(plantilla) && (
                          <p className="text-xs text-amber-600 mt-1 font-medium">
                            ⚠️ Archivo nuevo - Se subirá al guardar
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Versión</label>
                          <input
                            type="text"
                            value={plantilla.version}
                            onChange={(e) => actualizarPlantilla(plantilla.id, 'version', e.target.value)}
                            placeholder="1.0"
                            className="w-full px-3 py-2 text-sm border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Estado</label>
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => actualizarPlantilla(plantilla.id, 'activo', !plantilla.activo)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                plantilla.activo ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                plantilla.activo ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                            <span className="text-xs text-gray-700">{plantilla.activo ? 'Activa' : 'Inactiva'}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
                        <textarea
                          value={plantilla.descripcion}
                          onChange={(e) => actualizarPlantilla(plantilla.id, 'descripcion', e.target.value)}
                          rows={2}
                          placeholder="Descripción de la plantilla..."
                          className="w-full px-3 py-2 text-sm border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            >
              <Save className="w-4 h-4" />
              Guardar Plantillas
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
