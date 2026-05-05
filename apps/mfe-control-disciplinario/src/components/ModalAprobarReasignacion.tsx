/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MODAL APROBAR REASIGNACIÓN - JEFE OCID                     ║
 * ║  Control Interno Disciplinario - ESAP                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * Modal para que el Jefe de OCID apruebe o rechace solicitudes
 * de reasignación de procesos.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Shield, CheckCircle, XCircle, FileText, User,
  AlertTriangle, Clock, Calendar, ArrowRight, Info,
  MessageSquare, Users, Award, MapPin, TrendingUp,
  AlertCircle, ChevronRight, Ban
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== INTERFACES ====================
interface SolicitudReasignacion {
  id: string;
  procesoNumero: string;
  procesoId: string;
  etapaActual: string;
  profesionalActual: {
    nombre: string;
    id: string;
  };
  profesionalNuevo: {
    nombre: string;
    id: string;
    cargo: string;
    especialidad: string;
    cargaActual: string;
  };
  solicitadoPor: string;
  fechaSolicitud: string;
  justificacion: string;
  prioridad: 'urgente' | 'normal';
  denunciado: string;
}

interface ModalAprobarReasignacionProps {
  solicitud: SolicitudReasignacion;
  onClose: () => void;
  onAprobar: (solicitudId: string, observaciones: string) => void;
  onRechazar: (solicitudId: string, motivoRechazo: string) => void;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function ModalAprobarReasignacion({
  solicitud,
  onClose,
  onAprobar,
  onRechazar
}: ModalAprobarReasignacionProps) {
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const handleConfirmar = () => {
    if (!accion) {
      toast.error('Debe seleccionar una acción', {
        description: 'Aprobar o Rechazar la solicitud'
      });
      return;
    }

    if (accion === 'rechazar' && (!observaciones.trim() || observaciones.length < 30)) {
      toast.error('Motivo de rechazo insuficiente', {
        description: 'Debes escribir al menos 30 caracteres explicando el motivo del rechazo'
      });
      return;
    }

    if (accion === 'aprobar') {
      onAprobar(solicitud.id, observaciones);
    } else {
      onRechazar(solicitud.id, observaciones);
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* ==================== HEADER ==================== */}
          <div className="relative overflow-hidden">
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)'
              }}
            />
            
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative px-6 sm:px-8 py-5 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-2xl backdrop-blur-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Autorización de Reasignación
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-purple-100 font-medium">
                        Jefe de OCID
                      </p>
                      <div className="w-1 h-1 rounded-full bg-purple-300" />
                      <p className="text-sm text-purple-100 font-medium">
                        {solicitud.procesoNumero}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={onClose} 
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>
          </div>

          {/* ==================== PRIORITY BAR ==================== */}
          {solicitud.prioridad === 'urgente' && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 sm:px-8 py-3">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-sm">SOLICITUD URGENTE - Requiere atención inmediata</span>
              </div>
            </div>
          )}

          {/* ==================== CONTENT ==================== */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
            {/* Info de la Solicitud */}
            <div className="mb-6 p-5 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Fecha de Solicitud</p>
                    <p className="text-sm font-bold text-gray-900">{formatearFecha(solicitud.fechaSolicitud)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Solicitado Por</p>
                    <p className="text-sm font-bold text-gray-900">{solicitud.solicitadoPor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Etapa del Proceso</p>
                    <p className="text-sm font-bold text-gray-900">{solicitud.etapaActual}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Disciplinable</p>
                    <p className="text-sm font-bold text-gray-900">{solicitud.denunciado}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reasignación Propuesta */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                Reasignación Propuesta
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Profesional Actual */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-medium text-blue-600 mb-2">PROFESIONAL ACTUAL</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                      {solicitud.profesionalActual.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {solicitud.profesionalActual.nombre}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flecha */}
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-purple-100">
                    <ArrowRight className="w-6 h-6 text-purple-600" />
                  </div>
                </div>

                {/* Profesional Nuevo */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-medium text-green-600 mb-2">PROFESIONAL PROPUESTO</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-white text-sm">
                      {solicitud.profesionalNuevo.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {solicitud.profesionalNuevo.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Award className="w-3 h-3" />
                      <span className="truncate">{solicitud.profesionalNuevo.cargo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <TrendingUp className="w-3 h-3" />
                      <span>Carga: {solicitud.profesionalNuevo.cargaActual}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Justificación */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Justificación de la Solicitud
              </h3>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {solicitud.justificacion}
                </p>
              </div>
            </div>

            {/* Selección de Acción */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                Decisión <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAccion('aprobar')}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    accion === 'aprobar'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full ${accion === 'aprobar' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <CheckCircle className={`w-8 h-8 ${accion === 'aprobar' ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center">
                      <div className={`font-bold text-base ${accion === 'aprobar' ? 'text-green-900' : 'text-gray-700'}`}>
                        Aprobar Reasignación
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Autorizar el cambio de profesional
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAccion('rechazar')}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    accion === 'rechazar'
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full ${accion === 'rechazar' ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <XCircle className={`w-8 h-8 ${accion === 'rechazar' ? 'text-red-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center">
                      <div className={`font-bold text-base ${accion === 'rechazar' ? 'text-red-900' : 'text-gray-700'}`}>
                        Rechazar Solicitud
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Denegar el cambio propuesto
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Observaciones */}
            {accion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {accion === 'aprobar' ? 'Observaciones (Opcional)' : 'Motivo del Rechazo'}{' '}
                  {accion === 'rechazar' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder={
                    accion === 'aprobar'
                      ? 'Puedes agregar observaciones adicionales sobre la aprobación...'
                      : 'Explica las razones por las que se rechaza la reasignación (mínimo 30 caracteres)...'
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                />
                {accion === 'rechazar' && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {observaciones.length < 30 ? (
                        <span className="text-red-600 font-medium">
                          Mínimo 30 caracteres ({30 - observaciones.length} restantes)
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          ✓ Motivo completo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{observaciones.length} caracteres</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Advertencia de Trazabilidad */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Trazabilidad Automática
                </p>
                <p className="text-xs text-blue-700">
                  Esta decisión quedará registrada en el historial del proceso con tu identificación,
                  fecha, hora y será notificada automáticamente al solicitante y al nuevo profesional asignado.
                </p>
              </div>
            </div>
          </div>

          {/* ==================== FOOTER ==================== */}
          <div className="border-t border-gray-200 px-6 sm:px-8 py-4 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!accion || (accion === 'rechazar' && (!observaciones.trim() || observaciones.length < 30))}
                className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all ${
                  accion && (accion === 'aprobar' || observaciones.length >= 30)
                    ? accion === 'aprobar'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg hover:-translate-y-0.5'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  {accion === 'aprobar' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Aprobar Reasignación</span>
                    </>
                  ) : accion === 'rechazar' ? (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Rechazar Solicitud</span>
                    </>
                  ) : (
                    <span>Selecciona una opción</span>
                  )}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
