/**
 * ModalCambiarEtapaCoactivo - Modal para cambiar la etapa de un proceso coactivo
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, RefreshCw, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';

interface ModalCambiarEtapaCoactivoProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: {
    id: string;
    deudor: string;
    etapaActual: 'PERSUASIVA' | 'COACTIVA' | 'MEDIDAS_CAUTELARES' | 'EXCEPCIONES' | 'LIQUIDACION';
  };
  onCambiarEtapa?: (nuevaEtapa: string, justificacion: string) => void;
}

export function ModalCambiarEtapaCoactivo({
  isOpen,
  onClose,
  proceso,
  onCambiarEtapa
}: ModalCambiarEtapaCoactivoProps) {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>(proceso.etapaActual);
  const [justificacion, setJustificacion] = useState('');
  const [confirmarCambio, setConfirmarCambio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const etapas = [
    {
      value: 'PERSUASIVA' as const,
      label: 'Persuasiva',
      icon: '⚠️',
      color: 'amber',
      bg: 'bg-amber-100',
      textColor: 'text-amber-800',
      descripcion: 'Búsqueda de pago voluntario',
      requisitos: ['Notificación del título', 'Plazo para pago voluntario']
    },
    {
      value: 'COACTIVA' as const,
      label: 'Coactiva',
      icon: '⚖️',
      color: 'indigo',
      bg: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      descripcion: 'Inicio formal con Mandamiento de Pago',
      requisitos: ['Mandamiento expedido', 'Término de excepciones corriente']
    },
    {
      value: 'MEDIDAS_CAUTELARES' as const,
      label: 'Medidas Cautelares',
      icon: '🔒',
      color: 'purple',
      bg: 'bg-purple-100',
      textColor: 'text-purple-800',
      descripcion: 'Embargos y secuestros',
      requisitos: ['Resolución de embargo', 'Bienes identificados']
    },
    {
      value: 'EXCEPCIONES' as const,
      label: 'Excepciones',
      icon: '🛡️',
      color: 'red',
      bg: 'bg-red-100',
      textColor: 'text-red-800',
      descripcion: 'Defensa del deudor',
      requisitos: ['Excepciones presentadas', 'Resolución que resuelve excepciones']
    },
    {
      value: 'LIQUIDACION' as const,
      label: 'Liquidación',
      icon: '💰',
      color: 'green',
      bg: 'bg-green-100',
      textColor: 'text-green-800',
      descripcion: 'Cálculo final y costas',
      requisitos: ['Obligación ejecutoriada', 'Liquidación del crédito']
    }
  ];

  const etapaActualInfo = etapas.find(e => e.value === proceso.etapaActual);
  const etapaSeleccionadaInfo = etapas.find(e => e.value === etapaSeleccionada);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (etapaSeleccionada === proceso.etapaActual) {
      toast.error('Debe seleccionar una etapa diferente a la actual');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Debe ingresar una justificación para el cambio');
      return;
    }

    if (!confirmarCambio) {
      toast.error('Debe confirmar el cambio de etapa');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success(`✅ Etapa cambiada exitosamente a "${etapaSeleccionadaInfo?.label}"`, {
        description: 'El proceso ha sido actualizado'
      });

      onCambiarEtapa?.(etapaSeleccionada, justificacion);
      onClose();
    } catch (error) {
      toast.error('Error al cambiar la etapa del proceso');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calcular si es avance o retroceso
  const etapaActualIndex = etapas.findIndex(e => e.value === proceso.etapaActual);
  const etapaSeleccionadaIndex = etapas.findIndex(e => e.value === etapaSeleccionada);
  const esAvance = etapaSeleccionadaIndex > etapaActualIndex;
  const esRetroceso = etapaSeleccionadaIndex < etapaActualIndex;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[106]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-[107] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <ModalHeaderClean
              titulo="Cambiar Etapa del Proceso"
              subtitulo={`${proceso.id} • ${proceso.deudor}`}
              icono={RefreshCw}
              colorIcono="purple"
              onClose={onClose}
            />

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Etapa Actual */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-bold mb-2">Etapa Actual</p>
                <div className={`${etapaActualInfo?.bg} px-4 py-3 rounded-lg inline-flex items-center gap-3`}>
                  <span className="text-2xl">{etapaActualInfo?.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${etapaActualInfo?.textColor}`}>
                      {etapaActualInfo?.label}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      {etapaActualInfo?.descripcion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Visualización de Flujo */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-xs text-gray-600 font-bold mb-3">Flujo del Proceso Coactivo</p>
                <div className="flex items-center justify-between">
                  {etapas.map((etapa, index) => (
                    <div key={etapa.value} className="flex items-center">
                      <div className={`flex flex-col items-center ${etapa.value === proceso.etapaActual ? 'opacity-100' : 'opacity-40'
                        }`}>
                        <div className={`w-12 h-12 rounded-full ${etapa.value === proceso.etapaActual ? etapa.bg : 'bg-gray-200'
                          } flex items-center justify-center text-xl border-2 ${etapa.value === proceso.etapaActual ? 'border-purple-600 scale-110' : 'border-gray-300'
                          }`}>
                          {etapa.icon}
                        </div>
                        <p className="text-xs font-bold text-gray-900 mt-2 text-center">
                          {etapa.label}
                        </p>
                      </div>
                      {index < etapas.length - 1 && (
                        <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selector de Nueva Etapa */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Nueva Etapa *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {etapas.map((etapa) => (
                    <button
                      key={etapa.value}
                      type="button"
                      onClick={() => setEtapaSeleccionada(etapa.value)}
                      disabled={etapa.value === proceso.etapaActual}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${etapaSeleccionada === etapa.value && etapa.value !== proceso.etapaActual
                        ? 'border-purple-600 bg-purple-50'
                        : etapa.value === proceso.etapaActual
                          ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 ${etapa.bg} rounded-lg flex items-center justify-center text-2xl`}
                        >
                          {etapa.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{etapa.label}</p>
                            {etapa.value === proceso.etapaActual && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Actual
                              </span>
                            )}
                            {etapaSeleccionada === etapa.value && etapa.value !== proceso.etapaActual && (
                              <CheckCircle className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{etapa.descripcion}</p>
                          <div className="mt-2">
                            <p className="text-xs font-bold text-gray-700 mb-1">Requisitos:</p>
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {etapa.requisitos.map((req, idx) => (
                                <li key={idx}>• {req}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicador de Cambio */}
              {etapaSeleccionada !== proceso.etapaActual && (
                <div className={`p-4 rounded-lg border-2 ${esAvance ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    {esAvance ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    )}
                    <div>
                      <p className={`text-sm font-bold ${esAvance ? 'text-green-900' : 'text-orange-900'
                        }`}>
                        {esAvance ? 'Avance de Etapa' : 'Retroceso de Etapa'}
                      </p>
                      <p className={`text-xs mt-1 ${esAvance ? 'text-green-700' : 'text-orange-700'
                        }`}>
                        {esAvance
                          ? 'El proceso avanzará en el flujo coactivo normal.'
                          : 'El proceso retrocederá. Asegúrese de justificar este movimiento.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Justificación */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Justificación del Cambio *
                </label>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Ingrese la justificación técnica y legal para el cambio de etapa..."
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none resize-none"
                  required
                />
              </div>

              {/* Confirmación */}
              <div className={`p-4 rounded-lg border-2 ${esRetroceso ? 'bg-red-50 border-red-300' : 'bg-purple-50 border-purple-200'
                }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmarCambio}
                    onChange={(e) => setConfirmarCambio(e.target.checked)}
                    className="mt-1 w-5 h-5 border-2 border-purple-400 rounded"
                  />
                  <div>
                    <p className={`text-sm font-bold ${esRetroceso ? 'text-red-900' : 'text-purple-900'
                      }`}>
                      Confirmo el cambio de etapa
                    </p>
                    <p className={`text-xs mt-1 ${esRetroceso ? 'text-red-700' : 'text-purple-700'
                      }`}>
                      He verificado los requisitos y entiendo que este cambio quedará registrado
                      en el historial del proceso{esRetroceso ? ' y requiere supervisión especial' : ''}.
                    </p>
                  </div>
                </label>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    etapaSeleccionada === proceso.etapaActual ||
                    !justificacion.trim() ||
                    !confirmarCambio
                  }
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Cambiar Etapa
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
