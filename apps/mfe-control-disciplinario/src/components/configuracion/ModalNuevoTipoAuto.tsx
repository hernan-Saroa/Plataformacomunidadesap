/**
 * MODAL NUEVO TIPO DE AUTO - Configuración
 * Formulario para crear/editar tipos de autos con selector visual de tipo de acción
 * y carga obligatoria de plantilla .docx
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertCircle, Info, Save, Loader, Upload, FileText,
  Zap, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../../services/api/disciplinary.service';
import { type TipoAuto } from './SeccionPlantillasAutosUnificada';

// ─── Tipos de acción disponibles ───────────────────────────────────────────
export type TipoAccion = 'NORMAL' | 'APERTURA' | 'ARCHIVO' | 'PRORROGA' | 'PLIEGO';

// Mapea el tipo del backend al tipoAccion del formulario
const mapBackendToTipoAccion = (tipoBackend: string): TipoAccion => {
  switch (tipoBackend) {
    case 'AUTO_NORMAL':
      return 'NORMAL';
    case 'AUTO_ARCHIVO':
      return 'ARCHIVO';
    case 'AUTO_PRORROGA':
      return 'PRORROGA';
    case 'AUTO_FORMULACION_PLIEGO':
      return 'PLIEGO';
    default:
      // Para tipos dinámicos de apertura: AUTO_APERTURA_*
      if (tipoBackend.startsWith('AUTO_APERTURA_')) {
        return 'APERTURA';
      }
      return 'NORMAL'; // fallback
  }
};

const TIPOS_ACCION: {
  id: TipoAccion;
  label: string;
  descripcion: string;
  conAccion: boolean;
}[] = [
  {
    id: 'NORMAL',
    label: 'Normal',
    descripcion: 'Auto sin cambio de etapa automático',
    conAccion: false,
  },
  {
    id: 'APERTURA',
    label: 'Apertura',
    descripcion: 'Abre una nueva etapa (Investigación o Indagación)',
    conAccion: true,
  },
  {
    id: 'ARCHIVO',
    label: 'Archivo',
    descripcion: 'Archiva el proceso disciplinario',
    conAccion: true,
  },
  {
    id: 'PRORROGA',
    label: 'Prórroga',
    descripcion: 'Prorroga el término de la etapa actual',
    conAccion: true,
  },
  {
    id: 'PLIEGO',
    label: 'Pliego de Cargos',
    descripcion: 'Formula el pliego de cargos al investigado',
    conAccion: true,
  },
];

// ─── Interface exportada ────────────────────────────────────────────────────
export interface NuevoTipoAutoData
  extends Omit<TipoAuto, 'id' | 'fechaCreacion' | 'fechaModificacion' | 'plantillas'> {
  tipoAccion: TipoAccion;
  plantillaFile?: File;
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface ModalNuevoTipoAutoProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (data: NuevoTipoAutoData) => boolean | void | Promise<boolean | void>;
  tipoEdicion?: TipoAuto | null;
}

// ─── Componente ─────────────────────────────────────────────────────────────
export function ModalNuevoTipoAuto({
  isOpen,
  onClose,
  onGuardar,
  tipoEdicion,
}: ModalNuevoTipoAutoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    etapa: 'INVESTIGACION',
    activo: true,
    orden: 1,
    tipoAccion: 'NORMAL' as TipoAccion,
    plantillaFile: undefined as File | undefined,
  });

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Stages from API
  const [stages, setStages] = useState<Array<{ id: string; etapa: string; orden: number; activo: boolean; color?: string; descripcion?: string }>>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  // Cargar stages activos
  useEffect(() => {
    const loadStages = async () => {
      try {
        setLoadingStages(true);
        const stagesData = await disciplinaryService.getStageConfiguration();
        const activeStages = stagesData.filter(stage => stage.activo);
        setStages(activeStages);
      } catch (error) {
        console.error('Error loading stages:', error);
        toast.error('Error al cargar las etapas');
      } finally {
        setLoadingStages(false);
      }
    };

    if (isOpen) {
      loadStages();
    }
  }, [isOpen]);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (tipoEdicion) {
      // Para tipos dinámicos de apertura, extraer la etapa del tipo
      let etapa = tipoEdicion.etapa;
      let tipoAccion = mapBackendToTipoAccion(tipoEdicion.tipo || '');

      // Si es tipo dinámico de apertura y no hay etapa específica, extraerla del tipo
      if (tipoEdicion.tipo?.startsWith('AUTO_APERTURA_') && tipoEdicion.tipo !== 'AUTO_APERTURA') {
        const etapaFromTipo = tipoEdicion.tipo.replace('AUTO_APERTURA_', '').replace(/_/g, ' ');
        etapa = etapaFromTipo;
      }

      setFormData({
        nombre: tipoEdicion.nombre,
        etapa: etapa,
        activo: tipoEdicion.activo,
        orden: tipoEdicion.orden,
        tipoAccion: tipoAccion,
        plantillaFile: undefined,
      });
    } else {
      setFormData({
        nombre: '',
        etapa: stages.length > 0 ? stages[0].etapa : 'INVESTIGACION',
        activo: true,
        orden: 1,
        tipoAccion: 'NORMAL',
        plantillaFile: undefined,
      });
    }
  }, [tipoEdicion, isOpen, stages]);

  const esConAccion = TIPOS_ACCION.find((t) => t.id === formData.tipoAccion)?.conAccion ?? false;

  const validar = (): boolean => {
    const e: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      e.nombre = 'El nombre del auto es obligatorio';
    } else if (formData.nombre.trim().length < 5) {
      e.nombre = 'El nombre debe tener al menos 5 caracteres';
    }

    // Plantilla obligatoria al crear, opcional al editar
    if (!tipoEdicion && !formData.plantillaFile) {
      e.plantilla = 'Debes adjuntar la plantilla .docx para crear el tipo de auto';
    }

    if (formData.plantillaFile) {
      const nombre = formData.plantillaFile.name.toLowerCase();
      if (!nombre.endsWith('.docx') && !nombre.endsWith('.doc')) {
        e.plantilla = 'Solo se aceptan archivos Word (.docx / .doc)';
      }
    }

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) {
      toast.error('Formulario incompleto', {
        description: 'Revisa los campos marcados en rojo',
      });
      return;
    }

    setGuardando(true);
    try {
      await new Promise((r) => setTimeout(r, 300));

      const data: NuevoTipoAutoData = {
        nombre: formData.nombre.trim(),
        etapa: formData.etapa,
        activo: formData.activo,
        orden: formData.orden,
        tipoAccion: formData.tipoAccion,
        plantillaFile: formData.plantillaFile,

      };

      const resultado = await onGuardar(data);

      if (resultado === false) {
        return;
      }

      toast.success(tipoEdicion ? 'Tipo de auto actualizado' : 'Tipo de auto creado', {
        description: formData.nombre,
      });
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
      toast.error('Error al guardar el tipo de auto');
    } finally {
      setGuardando(false);
    }
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    const nombre = file.name.toLowerCase();
    if (!nombre.endsWith('.docx') && !nombre.endsWith('.doc')) {
      setErrores((prev) => ({ ...prev, plantilla: 'Solo se aceptan archivos Word (.docx / .doc)' }));
      return;
    }
    setFormData((prev) => ({ ...prev, plantillaFile: file }));
    setErrores((prev) => {
      const { plantilla, ...rest } = prev;
      return rest;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* ── Header ── */}
            <div
              className="px-5 py-4 flex items-center justify-between text-white flex-shrink-0"
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

            {/* ── Cuerpo ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nombre del Auto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }));
                    setErrores((prev) => { const { nombre, ...r } = prev; return r; });
                  }}
                  disabled={guardando}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    errores.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Auto de Apertura de Investigación Disciplinaria"
                />
                {errores.nombre && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errores.nombre}
                  </p>
                )}
              </div>

              {/* Tipo de acción — tarjetas */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Tipo de Acción <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {TIPOS_ACCION.map((tipo) => {
                    const selected = formData.tipoAccion === tipo.id;
                    return (
                      <button
                        key={tipo.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, tipoAccion: tipo.id }))}
                        disabled={guardando}
                        className={`relative flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all ${
                          selected
                            ? tipo.conAccion
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {selected && (
                          <CheckCircle2
                            className={`absolute top-1.5 right-1.5 w-3.5 h-3.5 ${
                              tipo.conAccion ? 'text-amber-500' : 'text-blue-500'
                            }`}
                          />
                        )}
                        {tipo.conAccion ? (
                          <Zap
                            className={`w-5 h-5 mb-1.5 ${
                              selected ? 'text-amber-500' : 'text-gray-400'
                            }`}
                          />
                        ) : (
                          <FileText
                            className={`w-5 h-5 mb-1.5 ${
                              selected ? 'text-blue-500' : 'text-gray-400'
                            }`}
                          />
                        )}
                        <span
                          className={`text-xs font-bold leading-tight ${
                            selected
                              ? tipo.conAccion
                                ? 'text-amber-700'
                                : 'text-blue-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {tipo.label}
                        </span>
                        {tipo.conAccion && (
                          <span className="mt-1 text-xs font-semibold text-amber-600">
                            ⚡ Con acción
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {TIPOS_ACCION.find((t) => t.id === formData.tipoAccion)?.descripcion}
                </p>
              </div>

              {/* Alerta tipo con acción */}
              <AnimatePresence>
                {esConAccion && (
                  <motion.div
                    key="alerta-accion"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
                      <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        <span className="font-bold">Auto con acción automática:</span> Al aprobarse
                        este tipo de auto, el sistema cambiará automáticamente el estado o etapa del
                        proceso disciplinario.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Etapa — solo si tipoAccion es APERTURA */}
              <AnimatePresence>
                {formData.tipoAccion === 'APERTURA' && (
                  <motion.div
                    key="etapa-selector"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Etapa que Abre <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.etapa}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            etapa: e.target.value,
                          }))
                        }
                        disabled={guardando || loadingStages}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        {loadingStages ? (
                          <option disabled>Cargando etapas...</option>
                        ) : (
                          stages
                            .sort((a, b) => a.orden - b.orden)
                            .map((stage) => (
                              <option key={stage.id} value={stage.etapa}>
                                {stage.etapa}
                              </option>
                            ))
                        )}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Etapa a la que pasará el proceso al aprobar este auto
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Plantilla .docx */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Plantilla Word (.docx){' '}
                  {!tipoEdicion && <span className="text-red-500">*</span>}
                  {tipoEdicion && (
                    <span className="ml-1 text-gray-400 font-normal">(opcional al editar)</span>
                  )}
                </label>

                {formData.plantillaFile ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-800 truncate">
                        {formData.plantillaFile.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {(formData.plantillaFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, plantillaFile: undefined }))
                      }
                      disabled={guardando}
                      className="p-1 rounded hover:bg-green-100 text-green-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      dragging
                        ? 'border-blue-400 bg-blue-50'
                        : errores.plantilla
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <Upload
                      className={`w-7 h-7 ${
                        errores.plantilla ? 'text-red-400' : 'text-gray-400'
                      }`}
                    />
                    <p className="text-sm font-semibold text-gray-700">
                      Arrastra o haz clic para subir la plantilla
                    </p>
                    <p className="text-xs text-gray-500">Solo archivos .docx / .doc</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />

                {errores.plantilla && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errores.plantilla}
                  </p>
                )}
              </div>



              {/* Estado activo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Estado del tipo de auto</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formData.activo
                      ? 'Disponible para usar en procesos disciplinarios'
                      : 'No estará disponible para nuevos procesos'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, activo: !prev.activo }))}
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

            {/* ── Footer ── */}
            <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-end gap-2.5 flex-shrink-0">
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
                  background: guardando
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
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
