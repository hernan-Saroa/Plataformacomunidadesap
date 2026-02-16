import { X, User, Clock, MapPin, Monitor, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  action: string;
  module: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'success' | 'failed' | 'warning';
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  duration: string;
  details: string;
  // Campos de tracking de cambios
  entityName?: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  changes?: {
    field: string;
    before: string;
    after: string;
  }[];
}

interface AuditEventDetailProps {
  event: AuditEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditEventDetail({ event, isOpen, onClose }: AuditEventDetailProps) {
  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!event || !isOpen) return null;

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Crítico', icon: AlertCircle };
      case 'high':
        return { bg: '#FEF3C7', color: '#92400E', label: 'Alto', icon: AlertCircle };
      case 'medium':
        return { bg: '#DBEAFE', color: '#1E40AF', label: 'Medio', icon: Info };
      case 'low':
        return { bg: '#D1FAE5', color: '#065F46', label: 'Bajo', icon: CheckCircle };
      case 'info':
        return { bg: '#F3F4F6', color: '#1F2937', label: 'Info', icon: Info };
      default:
        return { bg: '#F3F4F6', color: '#1F2937', label: 'Info', icon: Info };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return { bg: '#D1FAE5', color: '#065F46', label: 'Exitoso' };
      case 'failed':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Fallido' };
      case 'warning':
        return { bg: '#FEF3C7', color: '#92400E', label: 'Advertencia' };
      default:
        return { bg: '#F3F4F6', color: '#1F2937', label: 'Desconocido' };
    }
  };

  const severityConfig = getSeverityConfig(event.severity);
  const statusConfig = getStatusConfig(event.status);
  const SeverityIcon = severityConfig.icon;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed left-0 right-0 top-0 bottom-0 z-[10000] flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none overflow-y-auto">
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden pointer-events-auto my-auto mx-auto"
              style={{ boxShadow: 'var(--esap-shadow-2xl)' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-[--esap-gray-200] bg-gradient-to-r from-[--esap-gray-50] to-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ 
                          background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)',
                          boxShadow: 'var(--esap-shadow-md)'
                        }}
                      >
                        <SeverityIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-[--esap-gray-900]">
                          Detalles del Evento
                        </h2>
                        <p className="text-xs sm:text-sm text-[--esap-gray-600] truncate">
                          ID: {event.id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: severityConfig.bg,
                          color: severityConfig.color
                        }}
                      >
                        <SeverityIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                        {severityConfig.label}
                      </span>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color
                        }}
                      >
                        {statusConfig.label}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-[--esap-gray-100] text-[--esap-gray-700]">
                        {event.module}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 border-[--esap-gray-400] bg-white flex items-center justify-center hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] transition-all active:scale-95 flex-shrink-0"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-[--esap-gray-700]" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[calc(95vh-220px)] sm:max-h-[calc(90vh-200px)] scrollbar-thin scrollbar-thumb-[--esap-gray-300] scrollbar-track-[--esap-gray-100]">
                {/* Action */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-bold text-[--esap-gray-700] uppercase tracking-wide mb-2">
                    Acción Realizada
                  </h3>
                  <p className="text-sm sm:text-base text-[--esap-gray-900] font-semibold">
                    {event.action}
                  </p>
                  <p className="text-xs sm:text-sm text-[--esap-gray-600] mt-1">
                    {event.details}
                  </p>
                </div>

                {/* User & Time Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                  <div className="bg-[--esap-gray-50] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[--esap-gray-200]">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white border-2 border-[--esap-gray-300] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-[--esap-gray-700]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[--esap-gray-600] uppercase tracking-wide font-semibold">
                          Usuario
                        </p>
                        <p className="text-sm font-bold text-[--esap-gray-900] truncate">
                          {event.user}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[--esap-gray-600] truncate">
                      ID: {event.userId}
                    </p>
                  </div>

                  <div className="bg-[--esap-gray-50] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[--esap-gray-200]">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white border-2 border-[--esap-gray-300] flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[--esap-gray-700]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[--esap-gray-600] uppercase tracking-wide font-semibold">
                          Fecha y Hora
                        </p>
                        <p className="text-sm font-bold text-[--esap-gray-900]">
                          {event.timestamp}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[--esap-gray-600]">
                      Duración: {event.duration}
                    </p>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="bg-[--esap-gray-50] rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 border border-[--esap-gray-200] mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-bold text-[--esap-gray-700] uppercase tracking-wide mb-3 sm:mb-4">
                    Detalles Técnicos
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[--esap-gray-600] mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-xs text-[--esap-gray-600] font-semibold mb-0.5">
                          Dirección IP
                        </p>
                        <p className="text-sm text-[--esap-gray-900] font-mono">
                          {event.ipAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[--esap-gray-600] mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-xs text-[--esap-gray-600] font-semibold mb-0.5">
                          Ubicación
                        </p>
                        <p className="text-sm text-[--esap-gray-900]">
                          {event.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Monitor className="w-4 h-4 text-[--esap-gray-600] mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-xs text-[--esap-gray-600] font-semibold mb-0.5">
                          Dispositivo
                        </p>
                        <p className="text-sm text-[--esap-gray-900]">
                          {event.device}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Monitor className="w-4 h-4 text-[--esap-gray-600] mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-xs text-[--esap-gray-600] font-semibold mb-0.5">
                          Navegador
                        </p>
                        <p className="text-sm text-[--esap-gray-900]">
                          {event.browser}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Changes */}
                {event.changes && event.changes.length > 0 && (
                  <div className="bg-amber-50 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 border border-amber-200 mb-4 sm:mb-6">
                    <h3 className="text-xs sm:text-sm font-bold text-amber-900 uppercase tracking-wide mb-3 sm:mb-4">
                      Cambios Realizados
                      {event.entityName && (
                        <span className="ml-2 font-normal text-amber-700">
                          en {event.entityName} {event.entityId && `(ID: ${event.entityId})`}
                        </span>
                      )}
                    </h3>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {event.changes.map((change, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 sm:p-4 border border-amber-200">
                          <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">
                            {change.field}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            <div>
                              <p className="text-xs text-[--esap-gray-600] mb-1">Antes:</p>
                              <p className="text-sm text-[--esap-gray-900] font-mono bg-red-50 px-2 py-1 rounded break-all">
                                {change.before !== 'N/A' && change.before !== 'undefined' ? change.before : <span className="text-gray-400 italic">Sin valor</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[--esap-gray-600] mb-1">Después:</p>
                              <p className="text-sm text-[--esap-gray-900] font-mono bg-green-50 px-2 py-1 rounded break-all">
                                {change.after !== 'N/A' && change.after !== 'undefined' ? change.after : <span className="text-gray-400 italic">Sin valor</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Datos Completos (sin cambios específicos) */}
                {!event.changes?.length && (event.previousData || event.newData) && (
                  <div className="bg-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 border border-blue-200 mb-4 sm:mb-6">
                    <h3 className="text-xs sm:text-sm font-bold text-blue-900 uppercase tracking-wide mb-3 sm:mb-4">
                      Datos del Registro
                      {event.entityName && (
                        <span className="ml-2 font-normal text-blue-700">
                          - {event.entityName} {event.entityId && `(ID: ${event.entityId})`}
                        </span>
                      )}
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {event.previousData && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 uppercase mb-2">Datos Anteriores</p>
                          <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs overflow-auto max-h-48 text-gray-800">
                            {JSON.stringify(event.previousData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {event.newData && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase mb-2">Datos Nuevos</p>
                          <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs overflow-auto max-h-48 text-gray-800">
                            {JSON.stringify(event.newData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {!event.previousData && event.newData && (
                        <div className="lg:col-span-2">
                          <p className="text-xs text-blue-600 italic">Este es un registro nuevo (sin datos anteriores)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mensaje cuando no hay datos de cambios */}
                {!event.changes?.length && !event.previousData && !event.newData && (
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 border border-gray-200 mb-4 sm:mb-6">
                    <p className="text-sm text-gray-500 italic text-center">
                      No se registraron datos de cambios para esta acción
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 border-t border-[--esap-gray-200] bg-[--esap-gray-50] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-[--esap-gray-400] bg-white text-[--esap-gray-700] rounded-lg sm:rounded-xl text-sm font-semibold hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] transition-all active:scale-98"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    console.log('Exportar evento', event.id);
                  }}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-white rounded-lg sm:rounded-xl text-sm font-semibold transition-all active:scale-98"
                  style={{ 
                    background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)',
                    boxShadow: 'var(--esap-shadow-md)' 
                  }}
                >
                  Exportar Evento
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
