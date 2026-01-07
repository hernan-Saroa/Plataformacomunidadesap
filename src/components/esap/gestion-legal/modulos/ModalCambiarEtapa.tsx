/**
 * ModalCambiarEtapa - Modal para cambiar la etapa de un requerimiento
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, Edit, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface ModalCambiarEtapaProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  etapaActual: 'RECIBIDO' | 'ANALISIS' | 'RESPUESTA' | 'ENVIADO';
  onCambioEtapa?: (nuevaEtapa: 'RECIBIDO' | 'ANALISIS' | 'RESPUESTA' | 'ENVIADO') => void;
}

export function ModalCambiarEtapa({
  isOpen,
  onClose,
  requerimientoId,
  etapaActual,
  onCambioEtapa
}: ModalCambiarEtapaProps) {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(etapaActual);
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const etapas = [
    {
      value: 'RECIBIDO' as const,
      label: 'Recibido',
      icon: '📥',
      color: '#6B7280',
      bg: '#F3F4F6',
      descripcion: 'Requerimiento recibido y registrado en el sistema'
    },
    {
      value: 'ANALISIS' as const,
      label: 'En Análisis',
      icon: '🔍',
      color: '#F59E0B',
      bg: '#FEF3C7',
      descripcion: 'Revisión y análisis del requerimiento en curso'
    },
    {
      value: 'RESPUESTA' as const,
      label: 'Elaborando Respuesta',
      icon: '✍️',
      color: '#2962FF',
      bg: '#DBEAFE',
      descripcion: 'Preparación y redacción de la respuesta oficial'
    },
    {
      value: 'ENVIADO' as const,
      label: 'Respuesta Enviada',
      icon: '✅',
      color: '#10B981',
      bg: '#D1FAE5',
      descripcion: 'Respuesta enviada al órgano de control'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(`✅ Etapa cambiada exitosamente a "${etapas.find(e => e.value === etapaSeleccionada)?.label}"`);
    
    if (onCambioEtapa) {
      onCambioEtapa(etapaSeleccionada);
    }

    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-[9999] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-lg">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cambiar Etapa</h2>
                  <p className="text-sm text-gray-600">{requerimientoId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Etapa Actual */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-bold mb-1">Etapa Actual</p>
                <p className="text-sm font-bold text-blue-900">
                  {etapas.find(e => e.value === etapaActual)?.icon} {etapas.find(e => e.value === etapaActual)?.label}
                </p>
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
                      disabled={etapa.value === etapaActual}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        etapaSeleccionada === etapa.value
                          ? 'border-blue-600 bg-blue-50'
                          : etapa.value === etapaActual
                          ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: etapa.bg }}
                        >
                          {etapa.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{etapa.label}</p>
                            {etapa.value === etapaActual && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                Actual
                              </span>
                            )}
                            {etapaSeleccionada === etapa.value && etapa.value !== etapaActual && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{etapa.descripcion}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ingrese las observaciones sobre el cambio de etapa..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Alerta informativa */}
              {etapaSeleccionada !== etapaActual && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Importante</p>
                    <p className="text-xs text-amber-700 mt-1">
                      El cambio de etapa quedará registrado en el historial del requerimiento y se notificará automáticamente a todos los involucrados.
                    </p>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || etapaSeleccionada === etapaActual}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
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

