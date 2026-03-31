/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL DE GESTIÓN DE EVIDENCIAS COMPLETO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal unificado para gestión de evidencias de actividades del Plan Anual:
 * - Configuración de requisitos de evidencia
 * - Bitácora de observaciones con historial
 * - Archivos adjuntos con validación
 * - Validación automática de completitud
 * - Interfaz 4K optimizada
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Settings, Save, AlertCircle, CheckCircle2, Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  ConfiguracionEvidencias,
  ObservacionHistorica,
  ArchivoAdjunto,
  SelectorConfiguracion,
  BitacoraObservaciones,
  GestionAdjuntos,
  IndicadorValidacion,
  validarEvidencias,
  CONFIGURACIONES_PREDEFINIDAS
} from './SistemaEvidenciasActividades';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface Actividad {
  id: number;
  nombre: string;
  descripcion: string;
  configuracionEvidencias?: ConfiguracionEvidencias;
  adjuntos?: ArchivoAdjunto[];
  bitacoraObservaciones?: ObservacionHistorica[];
}

interface ModalEvidenciasActividadProps {
  actividad: Actividad;
  onCerrar: () => void;
  onActualizar: (datos: {
    configuracionEvidencias: ConfiguracionEvidencias;
    adjuntos: ArchivoAdjunto[];
    bitacoraObservaciones: ObservacionHistorica[];
  }) => void;
  soloLectura?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ModalEvidenciasActividadCompleto({
  actividad,
  onCerrar,
  onActualizar,
  soloLectura = false
}: ModalEvidenciasActividadProps) {
  // Estados
  const [configuracion, setConfiguracion] = useState<ConfiguracionEvidencias>(
    actividad.configuracionEvidencias || CONFIGURACIONES_PREDEFINIDAS.FLEXIBLE
  );
  const [adjuntos, setAdjuntos] = useState<ArchivoAdjunto[]>(
    actividad.adjuntos || []
  );
  const [observaciones, setObservaciones] = useState<ObservacionHistorica[]>(
    actividad.bitacoraObservaciones || []
  );
  const [tabActiva, setTabActiva] = useState<'evidencias' | 'configuracion'>('evidencias');

  // Función para agregar observación
  const handleAgregarObservacion = (texto: string) => {
    const now = new Date();
    const nuevaObservacion: ObservacionHistorica = {
      id: crypto.randomUUID(),
      texto,
      fechaCreacion: now.toISOString(),
      horaCreacion: now.toLocaleTimeString('es-CO', { hour12: false }),
      responsable: {
        nombre: 'Mario Oswaldo Bernal', // TODO: Obtener del contexto de autenticación
        cargo: 'Jefe de Control Interno'
      },
      editada: false
    };
    setObservaciones([...observaciones, nuevaObservacion]);
  };

  // Función para editar observación
  const handleEditarObservacion = (id: string, nuevoTexto: string) => {
    const now = new Date();
    setObservaciones(
      observaciones.map((obs) =>
        obs.id === id
          ? {
              ...obs,
              texto: nuevoTexto,
              editada: true,
              fechaEdicion: now.toISOString(),
              horaEdicion: now.toLocaleTimeString('es-CO', { hour12: false })
            }
          : obs
      )
    );
  };

  // Función para eliminar observación
  const handleEliminarObservacion = (id: string) => {
    setObservaciones(observaciones.filter((obs) => obs.id !== id));
  };

  // Función para agregar adjunto
  const handleAgregarAdjunto = (adjunto: Omit<ArchivoAdjunto, 'id'>) => {
    const nuevoAdjunto: ArchivoAdjunto = {
      ...adjunto,
      id: crypto.randomUUID()
    };
    setAdjuntos([...adjuntos, nuevoAdjunto]);
  };

  // Función para eliminar adjunto
  const handleEliminarAdjunto = (id: string) => {
    setAdjuntos(adjuntos.filter((adj) => adj.id !== id));
  };

  // Validación
  const validacion = validarEvidencias(
    {
      adjuntos,
      observaciones,
      cumpleRequisitos: false,
      mensajesValidacion: []
    },
    configuracion
  );

  // Guardar cambios
  const handleGuardar = () => {
    if (!validacion.valido) {
      toast.error('Evidencias incompletas', {
        description: 'Completa los requisitos antes de guardar'
      });
      return;
    }

    onActualizar({
      configuracionEvidencias: configuracion,
      adjuntos,
      bitacoraObservaciones: observaciones
    });

    toast.success('Evidencias actualizadas correctamente');
    onCerrar();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 lg:p-6"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col"
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">
                Gestión de evidencias
              </h2>
              <p className="text-blue-100 text-sm lg:text-base font-medium line-clamp-2">
                {actividad.nombre}
              </p>
              {soloLectura && (
                <span className="inline-block mt-2 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-lg text-xs font-bold">
                  SOLO LECTURA
                </span>
              )}
            </div>
            <button
              onClick={onCerrar}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTabActiva('evidencias')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                tabActiva === 'evidencias'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700/70'
              }`}
            >
              📎 Evidencias
            </button>
            <button
              onClick={() => setTabActiva('configuracion')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                tabActiva === 'configuracion'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700/70'
              }`}
            >
              ⚙️ Configuración
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONTENIDO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {tabActiva === 'evidencias' ? (
              <motion.div
                key="evidencias"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Indicador de validación */}
                <IndicadorValidacion
                  estado={{
                    adjuntos,
                    observaciones,
                    cumpleRequisitos: validacion.valido,
                    mensajesValidacion: validacion.mensajes
                  }}
                  configuracion={configuracion}
                />

                {/* Gestión de adjuntos */}
                <GestionAdjuntos
                  adjuntos={adjuntos}
                  onAgregar={handleAgregarAdjunto}
                  onEliminar={handleEliminarAdjunto}
                  configuracion={configuracion}
                />

                {/* Bitácora de observaciones */}
                <BitacoraObservaciones
                  observaciones={observaciones}
                  onAgregar={handleAgregarObservacion}
                  onEditar={handleEditarObservacion}
                  onEliminar={handleEliminarObservacion}
                  configuracion={configuracion}
                />

                {/* Ayuda contextual */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-blue-900 mb-1">
                        💡 Acerca de las evidencias
                      </p>
                      <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                        <li>
                          Las evidencias demuestran el cumplimiento de la actividad
                        </li>
                        <li>
                          Puedes agregar múltiples observaciones con fecha y hora
                        </li>
                        <li>
                          Los archivos adjuntos son evidencia documental
                        </li>
                        <li>
                          La configuración define qué evidencias son obligatorias
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="configuracion"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Selector de configuración */}
                <SelectorConfiguracion
                  configuracionActual={configuracion}
                  onChange={setConfiguracion}
                />

                {/* Información sobre configuración */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Settings className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-amber-900 mb-1">
                        ⚙️ Configuración de requisitos
                      </p>
                      <p className="text-amber-800 mb-3">
                        Define qué tipo de evidencias son necesarias para completar esta actividad:
                      </p>
                      <ul className="text-amber-800 space-y-1 ml-4 list-disc">
                        <li>
                          <strong>OBLIGATORIO:</strong> No se puede completar la actividad sin esta
                          evidencia
                        </li>
                        <li>
                          <strong>OPCIONAL:</strong> Se puede agregar pero no es requerido
                        </li>
                        <li>
                          <strong>NO REQUERIDO:</strong> No se solicita esta evidencia
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Preview de requisitos actuales */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    📋 Requisitos actuales
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">Archivos adjuntos:</span>
                      <span
                        className={`px-3 py-1 rounded-lg text-sm font-bold ${
                          configuracion.adjuntosRequeridos === 'OBLIGATORIO'
                            ? 'bg-red-100 text-red-700'
                            : configuracion.adjuntosRequeridos === 'OPCIONAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {configuracion.adjuntosRequeridos}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">Observaciones:</span>
                      <span
                        className={`px-3 py-1 rounded-lg text-sm font-bold ${
                          configuracion.observacionRequerida === 'OBLIGATORIO'
                            ? 'bg-red-100 text-red-700'
                            : configuracion.observacionRequerida === 'OPCIONAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {configuracion.observacionRequerida}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Indicador de estado */}
            <div className="flex items-center gap-2">
              {validacion.valido ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Evidencias completas
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {validacion.mensajes.length} requisito(s) pendiente(s)
                  </span>
                </>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={onCerrar}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              {!soloLectura && (
                <button
                  onClick={handleGuardar}
                  disabled={!validacion.valido}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    validacion.valido
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-5 h-5" />
                  Guardar evidencias
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
