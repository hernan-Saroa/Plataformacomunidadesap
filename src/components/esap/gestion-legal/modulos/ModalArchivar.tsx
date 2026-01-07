/**
 * ModalArchivar - Modal de confirmación para archivar un requerimiento
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, Archive, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface ModalArchivarProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  requerimientoAsunto: string;
  onArchivar?: () => void;
}

export function ModalArchivar({
  isOpen,
  onClose,
  requerimientoId,
  requerimientoAsunto,
  onArchivar
}: ModalArchivarProps) {
  const [motivoArchivo, setMotivoArchivo] = useState<'COMPLETADO' | 'DUPLICADO' | 'OTRO'>('COMPLETADO');
  const [observaciones, setObservaciones] = useState('');
  const [confirmarArchivo, setConfirmarArchivo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const motivos = [
    {
      value: 'COMPLETADO' as const,
      label: 'Proceso Completado',
      icon: '✅',
      descripcion: 'El requerimiento fue atendido y la respuesta fue enviada exitosamente'
    },
    {
      value: 'DUPLICADO' as const,
      label: 'Requerimiento Duplicado',
      icon: '📋',
      descripcion: 'Este requerimiento es un duplicado de otro proceso existente'
    },
    {
      value: 'OTRO' as const,
      label: 'Otro Motivo',
      icon: '📝',
      descripcion: 'Especifique otro motivo en las observaciones'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmarArchivo) {
      toast.error('Debe confirmar que desea archivar el requerimiento');
      return;
    }

    if (motivoArchivo === 'OTRO' && !observaciones.trim()) {
      toast.error('Debe especificar el motivo en las observaciones');
      return;
    }

    setIsSubmitting(true);

    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success(`📦 Requerimiento ${requerimientoId} archivado exitosamente`);
    
    if (onArchivar) {
      onArchivar();
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
                <div className="p-2.5 bg-orange-600 rounded-lg">
                  <Archive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Archivar Requerimiento</h2>
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
              
              {/* Alerta de advertencia */}
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg flex gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">⚠️ Advertencia: Acción Importante</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Esta acción archivará el requerimiento y lo moverá a la sección de archivados. 
                    Podrá consultarlo posteriormente pero no estará visible en los listados activos.
                  </p>
                </div>
              </div>

              {/* Información del Requerimiento */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 font-bold mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Requerimiento a Archivar
                </p>
                <p className="text-sm font-mono font-bold text-gray-900 mb-2">{requerimientoId}</p>
                <p className="text-sm text-gray-700 line-clamp-2">{requerimientoAsunto}</p>
              </div>

              {/* Motivo de Archivo */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Motivo del Archivo *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {motivos.map((motivo) => (
                    <button
                      key={motivo.value}
                      type="button"
                      onClick={() => setMotivoArchivo(motivo.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        motivoArchivo === motivo.value
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{motivo.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{motivo.label}</p>
                            {motivoArchivo === motivo.value && (
                              <CheckCircle className="w-4 h-4 text-orange-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{motivo.descripcion}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Observaciones {motivoArchivo === 'OTRO' && '*'}
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder={motivoArchivo === 'OTRO' 
                    ? "Debe especificar el motivo del archivo..." 
                    : "Ingrese observaciones adicionales (opcional)..."
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  required={motivoArchivo === 'OTRO'}
                />
              </div>

              {/* Checkbox de confirmación */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmarArchivo}
                    onChange={(e) => setConfirmarArchivo(e.target.checked)}
                    className="mt-1 w-5 h-5 border-2 border-red-400 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-red-900">
                      Confirmo que deseo archivar este requerimiento
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      He verificado que este requerimiento puede ser archivado y que no requiere seguimiento activo.
                    </p>
                  </div>
                </label>
              </div>

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
                  disabled={isSubmitting || !confirmarArchivo || (motivoArchivo === 'OTRO' && !observaciones.trim())}
                  className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Archivando...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Archivar Requerimiento
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

