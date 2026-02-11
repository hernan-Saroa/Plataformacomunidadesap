/**
 * MODAL ARCHIVAR PROCESO DISCIPLINARIO - WORLD CLASS ✨
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 * Fase 3: Modal 1/3 - Sistema de archivo de procesos con confirmación doble
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertCircle,
  Archive,
  Info,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ProcesoDisciplinario {
  id: string;
  numeroProceso: string;
  etapaActual: string;
  denunciado: {
    nombre: string;
    identificacion: string;
    cargo?: string;
  };
  fechaInicio?: string;
}

interface Props {
  proceso: ProcesoDisciplinario;
  onClose: () => void;
  onConfirm: (datos: { motivo: string; observaciones: string }) => void;
}

export function ModalArchivarProceso({ proceso, onClose, onConfirm }: Props) {
  const [motivoArchivo, setMotivoArchivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleArchivar = async () => {
    // Validación de confirmación
    if (confirmacionTexto !== proceso.numeroProceso) {
      toast.error('Confirmación incorrecta', {
        description: 'Debes escribir correctamente el número de proceso para confirmar'
      });
      return;
    }
    
    // Validación de motivo
    if (!motivoArchivo.trim()) {
      toast.error('Motivo requerido', {
        description: 'Debes seleccionar el motivo del archivo'
      });
      return;
    }

    // Validación de observaciones (opcional pero recomendado)
    if (observaciones.trim().length < 10) {
      toast.warning('Observaciones recomendadas', {
        description: 'Se recomienda agregar observaciones detalladas (mínimo 10 caracteres)'
      });
    }

    // Simulación de loading
    setIsLoading(true);
    
    // Simular proceso de archivo
    setTimeout(() => {
      onConfirm({
        motivo: motivoArchivo,
        observaciones: observaciones.trim()
      });
      setIsLoading(false);
      
      toast.success('Proceso archivado exitosamente', {
        description: `El proceso ${proceso.numeroProceso} ha sido archivado correctamente`
      });
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header - Blanco */}
        <div className="p-6 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                <Archive className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#DC2626' }}>
                  Archivar Proceso Disciplinario
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Esta acción se puede revertir desde el módulo de archivados
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          {/* Advertencia */}
          <div className="p-4 rounded-xl border-l-4" style={{ background: '#FEF2F2', borderColor: '#DC2626' }}>
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
              <div className="flex-1">
                <p className="font-bold text-sm mb-2" style={{ color: '#991B1B' }}>
                  ⚠️ ADVERTENCIA: Acción de Archivo de Proceso
                </p>
                <p className="text-sm mb-3" style={{ color: '#7F1D1D' }}>
                  Estás a punto de archivar el siguiente proceso disciplinario. El proceso se moverá a la sección de archivados 
                  y ya no aparecerá en el dashboard operativo.
                </p>
                
                {/* Card del Proceso */}
                <div className="p-4 rounded-lg border-2 space-y-3" style={{ background: '#FFFFFF', borderColor: '#FECACA' }}>
                  {/* Número de Proceso */}
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: '#003DA5' }} />
                    <span className="text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                      Proceso:
                    </span>
                    <span className="font-bold font-mono" style={{ color: '#003DA5' }}>
                      {proceso.numeroProceso}
                    </span>
                  </div>

                  {/* Denunciado */}
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5" style={{ color: '#DC2626' }} />
                    <div className="flex-1">
                      <span className="text-xs font-semibold uppercase block mb-1" style={{ color: '#6B7280' }}>
                        Denunciado:
                      </span>
                      <p className="font-bold" style={{ color: '#1F2937' }}>{proceso.denunciado.nombre}</p>
                      <p className="text-sm" style={{ color: '#6B7280' }}>CC: {proceso.denunciado.identificacion}</p>
                      {proceso.denunciado.cargo && (
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>{proceso.denunciado.cargo}</p>
                      )}
                    </div>
                  </div>

                  {/* Etapa Actual */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: '#F59E0B' }} />
                    <span className="text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>
                      Etapa:
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
                      {proceso.etapaActual}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Motivo de Archivo */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Motivo de Archivo <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={motivoArchivo}
              onChange={(e) => setMotivoArchivo(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DC2626] disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="">Selecciona un motivo...</option>
              <option value="terminacion_anticipada">Terminación anticipada del proceso</option>
              <option value="prescripcion">Prescripción de la acción disciplinaria</option>
              <option value="decision_absolutoria">Decisión absolutoria definitiva</option>
              <option value="decision_sancionatoria">Decisión sancionatoria en firme</option>
              <option value="incompetencia">Incompetencia para conocer el proceso</option>
              <option value="muerte_investigado">Fallecimiento del investigado</option>
              <option value="retiro_servicio">Retiro del servicio antes de la sanción</option>
              <option value="proceso_duplicado">Proceso duplicado</option>
              <option value="archivo_preventivo">Archivo preventivo</option>
              <option value="otro">Otro motivo justificado</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Observaciones {observaciones.trim().length < 10 && <span style={{ color: '#F59E0B' }}>(Recomendado)</span>}
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={isLoading}
              placeholder="Describe los detalles del motivo del archivo, referencias normativas, fechas relevantes, etc."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] resize-none disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: '#E5E7EB' }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs" style={{ color: observaciones.trim().length < 10 ? '#F59E0B' : '#6B7280' }}>
                {observaciones.length} caracteres {observaciones.trim().length < 10 && '(Mínimo recomendado: 10)'}
              </p>
            </div>
          </div>

          {/* Confirmación de Archivo */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Confirmación de Archivo <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
              Para confirmar, escribe el número de proceso: <span className="font-mono font-semibold" style={{ color: '#1F2937' }}>{proceso.numeroProceso}</span>
            </p>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              disabled={isLoading}
              placeholder="Escribe el número de proceso aquí"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DC2626] font-mono disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: '#E5E7EB' }}
            />
            {confirmacionTexto && confirmacionTexto !== proceso.numeroProceso && (
              <p className="text-xs mt-2" style={{ color: '#DC2626' }}>❌ El número de proceso no coincide</p>
            )}
            {confirmacionTexto === proceso.numeroProceso && (
              <p className="text-xs mt-2" style={{ color: '#059669' }}>✅ Número de proceso confirmado</p>
            )}
          </div>

          {/* Nota de Auditoría */}
          <div className="p-4 rounded-xl border-2 flex items-start gap-3" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
            <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#2563EB' }} />
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              <strong>Registro de Auditoría:</strong> La acción de archivo quedará registrada en el sistema de auditoría con tu usuario, 
              fecha, hora exacta y motivo. Este registro es permanente y no puede ser modificado. El proceso archivado puede ser 
              consultado posteriormente desde el módulo de archivados.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3 sticky bottom-0 bg-white" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleArchivar}
            disabled={confirmacionTexto !== proceso.numeroProceso || !motivoArchivo || isLoading}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
            style={{ 
              background: confirmacionTexto === proceso.numeroProceso && motivoArchivo && !isLoading ? '#DC2626' : '#9CA3AF'
            }}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Archivando...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Archivar Proceso
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
