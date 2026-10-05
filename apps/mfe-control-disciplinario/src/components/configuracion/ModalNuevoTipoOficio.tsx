/**
 * MODAL NUEVO TIPO DE OFICIO
 * Modal para crear o editar tipos de oficios con soporte completo para carga de plantillas
 * ✅ Carga de plantilla (.docx, .doc, .dotx, .rtf, .pdf) tanto al crear como al editar
 * ✅ Drag & Drop y selector de archivo
 * ✅ Vista previa de plantilla existente con opción de reemplazo
 */

import { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, FileText, AlertCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  CATEGORIAS_OFICIOS, 
  type CategoriaOficioId, 
  type TipoOficio, 
  type NuevoTipoOficioData 
} from './SeccionPlantillasOficiosUnificada';

interface ModalNuevoTipoOficioProps {
  tipoOficioEdicion: TipoOficio | null;
  onGuardar: (tipo: NuevoTipoOficioData) => void | boolean | Promise<void | boolean>;
  onCerrar: () => void;
}

export function ModalNuevoTipoOficio({ tipoOficioEdicion, onGuardar, onCerrar }: ModalNuevoTipoOficioProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaOficioId>('TRAMITE');
  const [orden, setOrden] = useState(1);
  const [activo, setActivo] = useState(true);
  const [plantillaFile, setPlantillaFile] = useState<File | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tipoOficioEdicion) {
      setNombre(tipoOficioEdicion.nombre || '');
      setDescripcion(tipoOficioEdicion.descripcion || '');
      setCategoria(tipoOficioEdicion.categoria || 'TRAMITE');
      setOrden(tipoOficioEdicion.orden || 1);
      setActivo(tipoOficioEdicion.activo ?? true);
      setPlantillaFile(undefined);
    } else {
      setNombre('');
      setDescripcion('');
      setCategoria('TRAMITE');
      setOrden(1);
      setActivo(true);
      setPlantillaFile(undefined);
    }
    setErrores({});
  }, [tipoOficioEdicion]);

  const procesarArchivo = (file?: File) => {
    if (!file) return;
    const allowedExtensions = ['.docx', '.doc', '.dotx', '.rtf', '.pdf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setErrores(prev => ({ 
        ...prev, 
        plantilla: 'Solo se permiten archivos Word (.docx, .doc, .dotx, .rtf) o PDF (.pdf)' 
      }));
      toast.error('Formato no permitido', {
        description: 'Solo se permiten archivos Word o PDF'
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrores(prev => ({ 
        ...prev, 
        plantilla: 'El archivo no debe superar los 10 MB' 
      }));
      toast.error('Archivo muy grande', {
        description: 'El archivo no debe superar los 10 MB'
      });
      return;
    }

    setPlantillaFile(file);
    setErrores(prev => {
      const { plantilla, ...rest } = prev;
      return rest;
    });
    toast.success('Plantilla seleccionada', { description: file.name });
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarArchivo(e.dataTransfer.files[0]);
    }
  };

  const validar = (): boolean => {
    const e: Record<string, string> = {};

    if (!nombre.trim()) {
      e.nombre = 'El nombre del oficio es obligatorio';
    } else if (nombre.trim().length < 5) {
      e.nombre = 'El nombre debe tener al menos 5 caracteres';
    }

    if (!descripcion.trim()) {
      e.descripcion = 'La descripción es obligatoria';
    } else if (descripcion.trim().length < 10) {
      e.descripcion = 'La descripción debe tener al menos 10 caracteres';
    }

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) {
      toast.error('Formulario incompleto', {
        description: 'Revisa los campos obligatorios'
      });
      return;
    }

    setGuardando(true);
    try {
      const res = await onGuardar({ 
        nombre: nombre.trim(), 
        descripcion: descripcion.trim(), 
        categoria, 
        orden, 
        activo, 
        plantillaFile 
      });

      if (res === false) {
        return;
      }
    } catch (err) {
      console.error('Error al guardar tipo de oficio:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 1000 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
          >
            <div>
              <h3 className="text-lg font-bold">
                {tipoOficioEdicion ? 'Editar Tipo de Oficio' : 'Nuevo Tipo de Oficio'}
              </h3>
              <p className="text-xs text-purple-100 mt-0.5">
                Configura los datos del oficio y asocia su plantilla correspondiente
              </p>
            </div>
            <button 
              type="button" 
              onClick={onCerrar} 
              disabled={guardando}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre del Oficio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrores(prev => { const { nombre, ...rest } = prev; return rest; });
                }}
                disabled={guardando}
                placeholder="Ej: Oficio de Notificación de Auto"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all ${
                  errores.nombre ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.nombre && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errores.nombre}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaOficioId)}
                disabled={guardando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {(Object.keys(CATEGORIAS_OFICIOS) as CategoriaOficioId[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORIAS_OFICIOS[key].nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  setErrores(prev => { const { descripcion, ...rest } = prev; return rest; });
                }}
                disabled={guardando}
                rows={3}
                placeholder="Describe cuándo y cómo usar este tipo de oficio..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all ${
                  errores.descripcion ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.descripcion && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errores.descripcion}
                </p>
              )}
            </div>

            {/* Carga de Plantilla de Oficio */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Documento de Plantilla (Word / PDF)
              </label>

              {plantillaFile ? (
                <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-300 rounded-xl">
                  <FileText className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded">
                        Nuevo archivo seleccionado
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-green-900 truncate mt-0.5">
                      {plantillaFile.name}
                    </p>
                    <p className="text-xs text-green-700">
                      {(plantillaFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlantillaFile(undefined);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={guardando}
                    title="Quitar archivo seleccionado"
                    className="p-1.5 rounded-lg hover:bg-green-100 text-green-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ) : tipoOficioEdicion?.plantilla ? (
                <div className="flex items-center justify-between p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {tipoOficioEdicion.plantilla.nombre || tipoOficioEdicion.plantilla.nombreArchivo}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          v{tipoOficioEdicion.plantilla.version || '1.0'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {tipoOficioEdicion.plantilla.nombreArchivo || 'Plantilla asociada'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={guardando}
                    className="ml-3 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Cambiar plantilla
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    dragging
                      ? 'border-purple-500 bg-purple-50'
                      : errores.plantilla
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/50'
                  }`}
                >
                  <Upload className={`w-7 h-7 ${errores.plantilla ? 'text-red-500' : 'text-purple-600'}`} />
                  <p className="text-sm font-semibold text-gray-700">
                    Arrastra o haz clic para subir la plantilla
                  </p>
                  <p className="text-xs text-gray-500">Formatos permitidos: Word (.docx, .doc) o PDF (.pdf) hasta 10MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.dotx,.rtf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    procesarArchivo(e.target.files[0]);
                  }
                }}
              />

              {errores.plantilla && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errores.plantilla}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(parseInt(e.target.value) || 1)}
                  min="1"
                  disabled={guardando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Estado
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    disabled={guardando}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      activo ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      activo ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-sm text-gray-700 font-medium">{activo ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm text-white shadow-sm hover:shadow transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
            >
              <Save className="w-4 h-4" />
              {guardando ? 'Guardando...' : (tipoOficioEdicion ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
