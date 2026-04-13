/**
 * MODAL NUEVO TIPO DE AUTO - Configuración
 * Formulario simplificado para crear/editar tipos de autos
 * ✅ Las plantillas se gestionan desde otro modal
 * ✅ Validaciones completas
 * ✅ Diseño corporativo ESAP Desktop-First
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, AlertCircle, Info, Save, Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { ETAPAS_PROCESO, type EtapaProcesoId, type TipoAuto } from './SeccionPlantillasAutosUnificada';

interface ModalNuevoTipoAutoProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (tipoAuto: Omit<TipoAuto, 'id' | 'fechaCreacion' | 'fechaModificacion' | 'plantillas'>) => void;
  tipoEdicion?: TipoAuto | null;
}

export function ModalNuevoTipoAuto({ 
  isOpen, 
  onClose, 
  onGuardar, 
  tipoEdicion 
}: ModalNuevoTipoAutoProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    etapa: 'INVESTIGACION' as EtapaProcesoId,
    activo: true,
    orden: 1
  });

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (tipoEdicion) {
      setFormData({
        nombre: tipoEdicion.nombre,
        descripcion: tipoEdicion.descripcion,
        etapa: tipoEdicion.etapa,
        activo: tipoEdicion.activo,
        orden: tipoEdicion.orden
      });
    } else {
      // Reset para nuevo
      setFormData({
        nombre: '',
        descripcion: '',
        etapa: 'INVESTIGACION' as EtapaProcesoId,
        activo: true,
        orden: 1
      });
    }
    setErrores({});
  }, [tipoEdicion, isOpen]);

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre del auto es obligatorio';
    } else if (formData.nombre.trim().length < 5) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 5 caracteres';
    }

    if (!formData.descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es obligatoria';
    } else if (formData.descripcion.trim().length < 10) {
      nuevosErrores.descripcion = 'La descripción debe tener al menos 10 caracteres';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
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
      await new Promise(resolve => setTimeout(resolve, 500));

      const nuevoTipo: Omit<TipoAuto, 'id' | 'fechaCreacion' | 'fechaModificacion' | 'plantillas'> = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        etapa: formData.etapa,
        activo: formData.activo,
        orden: formData.orden
      };

      onGuardar(nuevoTipo);

      toast.success(tipoEdicion ? 'Tipo de auto actualizado' : 'Tipo de auto creado', {
        description: formData.nombre
      });

      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar', {
        description: 'No se pudo guardar el tipo de auto'
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div 
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
            >
              <div>
                <h3 className="text-lg font-bold">
                  {tipoEdicion ? 'Editar Tipo de Auto' : 'Nuevo Tipo de Auto'}
                </h3>
                <p className="text-sm mt-0.5 text-blue-100">
                  Configura un nuevo tipo de auto disciplinario
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
                {/* Nombre del Auto */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nombre del Auto <span className="text-red-500">*</span>
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
                    placeholder="Ej: Auto de Apertura de Investigación Disciplinaria"
                    disabled={guardando}
                  />
                  {errores.nombre && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.nombre}
                    </p>
                  )}
                </div>

                {/* Etapa del Proceso */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Etapa del Proceso <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.etapa}
                    onChange={(e) => setFormData({ ...formData, etapa: e.target.value as EtapaProcesoId })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    disabled={guardando}
                  >
                    {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[])
                      .sort((a, b) => ETAPAS_PROCESO[a].orden - ETAPAS_PROCESO[b].orden)
                      .map((key) => {
                        const etapa = ETAPAS_PROCESO[key];
                        return (
                          <option key={key} value={key}>
                            {etapa.nombre} - {etapa.descripcion}
                          </option>
                        );
                      })}
                  </select>
                  <p className="mt-1 text-xs text-gray-600 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Selecciona en qué etapa se usará este tipo de auto
                  </p>
                </div>

                {/* Descripción / Cuándo Usar */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Descripción / Cuándo Usar <span className="text-red-500">*</span>
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
                    placeholder="Describe cuándo y para qué se usa este tipo de auto..."
                    disabled={guardando}
                  />
                  {errores.descripcion && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.descripcion}
                    </p>
                  )}
                </div>

                {/* Estado Activo */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Estado del tipo de auto
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formData.activo 
                        ? 'Este tipo de auto estará disponible para usar' 
                        : 'Este tipo de auto no estará disponible'}
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

                {/* Información Adicional */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900">
                      <p className="font-semibold mb-1">Sobre las plantillas:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Después de crear el tipo de auto, podrás agregar múltiples plantillas</li>
                        <li>Usa el botón "Gestionar Plantillas" para agregar archivos Word/PDF</li>
                        <li>Las plantillas estarán disponibles para descargar desde el Kanban</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Botones */}
            <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-end gap-2.5">
              <button
                onClick={onClose}
                disabled={guardando}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {tipoEdicion ? 'Actualizar' : 'Crear'} Tipo de Auto
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}