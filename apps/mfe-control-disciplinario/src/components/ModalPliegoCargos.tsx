/**
 * MODAL AUTO PLIEGO DE CARGOS
 * Permite crear un auto pliego de cargos sobre un proceso disciplinario activo.
 * Al aprobarse por el jefe, el proceso se cierra y se notifica a jurídica.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertTriangle,
  FileText,
  Send,
  Info,
  Upload,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../services/api/disciplinary.service';

interface Proceso {
  id: string;
  radicadoProceso: string;
  etapaActual: string;
  estado: string;
  news?: {
    disciplinable?: any;
    hechos?: string;
  };
  abogadoAsignado?: {
    nombreCompleto?: string;
  };
}

interface Props {
  proceso: Proceso;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalPliegoCargos({ proceso, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [contenidoHtml, setContenidoHtml] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [loading, setLoading] = useState(false);

  const disciplinable = Array.isArray(proceso.news?.disciplinable)
    ? proceso.news.disciplinable[0]
    : proceso.news?.disciplinable;

  const nombreDisciplinable = disciplinable?.nombre || disciplinable?.nombreCompleto || 'No registrado';
  const identificacion = disciplinable?.cedula || disciplinable?.identificacion || 'N/A';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no puede superar 10 MB');
        return;
      }
      setArchivo(file);
    }
  };

  const handleCrear = async () => {
    if (!contenidoHtml.trim() && !archivo) {
      toast.error('Debes agregar contenido o adjuntar un documento');
      return;
    }

    setLoading(true);
    try {
      let documentUrl: string | undefined;
      let documentName: string | undefined;
      let documentType: string | undefined;
      let documentSize: number | undefined;

      // Subir archivo si existe
      if (archivo) {
        const data = await disciplinaryService.uploadFile(archivo, 'default', proceso.radicadoProceso);
        documentUrl = data.url;
        documentName = archivo.name;
        documentType = archivo.type;
        documentSize = archivo.size;
      }

      // Resolver la plantilla activa de Pliego de Cargos para poder identificarla
      // en la advertencia de eliminación de plantillas (no hay selector en este modal)
      let autoConfigurationId: string | undefined;
      try {
        const autosConfig = await disciplinaryService.getAutosConfigurationActive();
        autoConfigurationId = autosConfig.find(
          (c) => c.tipo === 'AUTO_FORMULACION_PLIEGO' && c.estado === 'activo',
        )?.id;
      } catch {
        // Si falla la consulta de configuración, se crea el auto sin autoConfigurationId
        // (mismo comportamiento que antes de este cambio)
      }

      await disciplinaryService.crearAuto({
        processId: proceso.id,
        tipoAuto: 'PLIEGO_CARGOS',
        autoConfigurationId,
        contenidoHtml: contenidoHtml || undefined,
        comentarios: comentarios || undefined,
        documentUrl,
        documentName,
        documentType,
        documentSize,
      });

      toast.success('Auto Pliego de Cargos creado exitosamente', {
        description: 'El auto ha sido creado como borrador. Envíalo a revisión del Jefe para continuar.',
      });
      onSuccess();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al crear el auto';
      toast.error('Error al crear Auto Pliego de Cargos', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-12 sm:pt-16 p-4"
      style={{ zIndex: 10000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                <FileText className="w-6 h-6" style={{ color: '#D97706' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#92400E' }}>
                  Auto Pliego de Cargos
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Paso {step} de 3 — {proceso.radicadoProceso}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: s <= step ? '#D97706' : '#E5E7EB' }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Info del proceso */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border-l-4" style={{ background: '#FFFBEB', borderColor: '#D97706' }}>
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm mb-2" style={{ color: '#92400E' }}>
                      Importante: Auto Pliego de Cargos
                    </p>
                    <p className="text-sm" style={{ color: '#78350F' }}>
                      Al ser aprobado por el Jefe OCID, este auto <strong>cerrará permanentemente</strong> el proceso
                      disciplinario y se enviará automáticamente un correo a la <strong>Oficina de Jurídica</strong> con
                      la información consolidada del expediente.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Información del Proceso
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Radicado</p>
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{proceso.radicadoProceso}</p>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Etapa Actual</p>
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{proceso.etapaActual}</p>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Disciplinable</p>
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{nombreDisciplinable}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{identificacion}</p>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Estado</p>
                  <p className="text-sm font-semibold" style={{ color: '#059669' }}>{proceso.estado}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contenido del auto */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Contenido del Auto Pliego de Cargos
              </h3>

              <div>
                <label className="block mb-2 text-sm font-bold" style={{ color: '#4B5563' }}>
                  Redactar contenido
                </label>
                <textarea
                  value={contenidoHtml}
                  onChange={(e) => setContenidoHtml(e.target.value)}
                  placeholder="Redacte el contenido del auto pliego de cargos..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-sm"
                  style={{ borderColor: '#E5E7EB', focusBorderColor: '#D97706' }}
                />
              </div>

              <div className="relative">
                <p className="text-center text-xs font-bold uppercase my-3" style={{ color: '#9CA3AF' }}>
                  — o adjuntar documento —
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold" style={{ color: '#4B5563' }}>
                  Adjuntar documento (PDF, Word)
                </label>
                <label
                  className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer hover:bg-amber-50/50 transition-colors"
                  style={{ borderColor: archivo ? '#D97706' : '#E5E7EB' }}
                >
                  {archivo ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
                      <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>{archivo.name}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); setArchivo(null); }}
                        className="text-xs underline"
                        style={{ color: '#DC2626' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2" style={{ color: '#9CA3AF' }} />
                      <span className="text-sm" style={{ color: '#6B7280' }}>
                        Click para seleccionar archivo (max 10 MB)
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold" style={{ color: '#4B5563' }}>
                  Comentarios adicionales (opcional)
                </label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Observaciones o comentarios..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-sm"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmación */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border-l-4" style={{ background: '#FFFBEB', borderColor: '#D97706' }}>
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm mb-2" style={{ color: '#92400E' }}>
                      Confirmar creación del Auto Pliego de Cargos
                    </p>
                    <p className="text-sm" style={{ color: '#78350F' }}>
                      Se creará un borrador de Auto Pliego de Cargos. Una vez enviado a revisión y <strong>aprobado por el Jefe</strong>:
                    </p>
                    <ul className="text-sm mt-2 space-y-1 list-disc pl-4" style={{ color: '#78350F' }}>
                      <li>El proceso pasará a estado <strong>CERRADO</strong></li>
                      <li>Se detendrá el conteo de vencimiento</li>
                      <li>Se enviará correo automático a la <strong>Oficina de Jurídica</strong></li>
                      <li>El proceso quedará bloqueado para modificaciones</li>
                    </ul>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Resumen
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Proceso</p>
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                    {proceso.radicadoProceso} — {nombreDisciplinable}
                  </p>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Contenido</p>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {contenidoHtml ? `${contenidoHtml.substring(0, 100)}...` : 'Sin contenido de texto'}
                  </p>
                  {archivo && (
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                      Archivo adjunto: {archivo.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border-2 flex items-start gap-3" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
                <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#2563EB' }} />
                <p className="text-xs" style={{ color: '#1E40AF' }}>
                  <strong>Nota:</strong> El auto se creará como borrador. Deberás enviarlo a revisión del Jefe OCID
                  desde el panel de autos del proceso. El cierre y notificación a jurídica ocurren solo tras la aprobación.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              Anterior
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cancelar
          </button>

          <div className="flex-1" />

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all"
              style={{ background: '#D97706' }}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleCrear}
              disabled={loading || (!contenidoHtml.trim() && !archivo)}
              className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
              style={{
                background: (!contenidoHtml.trim() && !archivo) ? '#9CA3AF' : '#D97706',
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Crear Auto Pliego de Cargos
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
