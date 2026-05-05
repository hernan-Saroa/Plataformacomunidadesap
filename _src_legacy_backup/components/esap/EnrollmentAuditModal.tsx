/**
 * MODAL: DETALLES DE AUDITORÍA DE ENROLAMIENTO
 * Vista detallada de un proceso de enrolamiento
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, User, Calendar, Clock, CheckCircle, Users, Mail } from 'lucide-react';
import { Badge } from '../ui/badge';

interface EnrollmentAuditModalProps {
  enrollment: any;
  onClose: () => void;
}

export function EnrollmentAuditModal({ enrollment, onClose }: EnrollmentAuditModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
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
        className="fixed inset-0 z-[111] flex items-center justify-center p-4"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full overflow-hidden"
          style={{
            maxWidth: '700px',
            maxHeight: '85vh',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-8 pt-8 pb-6 border-b"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <FileText className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-2xl">
                    Detalle de Auditoría
                  </h2>
                  <p className="font-normal mt-1 text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    {enrollment.type === 'MASIVO' ? 'Enrolamiento Masivo' : 'Enrolamiento Individual'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            <div className="space-y-6">
              {/* Información General */}
              <div>
                <h3 className="font-semibold mb-3 text-lg" style={{ color: '#1F2937' }}>
                  Información General
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                      Tipo de Enrolamiento
                    </p>
                    <Badge className={
                      enrollment.type === 'MASIVO' 
                        ? 'bg-[#F0FDF4] text-[#065F46] border-[#10B981]' 
                        : 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]'
                    }>
                      {enrollment.type === 'MASIVO' ? 'Carga Masiva' : 'Individual 1 a 1'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                      Estado
                    </p>
                    <Badge className={
                      enrollment.status === 'COMPLETADO' 
                        ? 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]' 
                        : enrollment.status === 'PENDIENTE'
                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]'
                        : 'bg-[#FFF7ED] text-[#C2410C] border-[#FB923C]'
                    }>
                      {enrollment.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Responsable */}
              <div>
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2" style={{ color: '#1F2937' }}>
                  <User className="w-5 h-5" style={{ color: '#003DA5' }} />
                  Responsable
                </h3>
                <div className="bg-[#F9FAFB] rounded-lg p-4">
                  <p className="font-semibold mb-1" style={{ color: '#1F2937' }}>
                    {enrollment.adminName}
                  </p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {enrollment.adminRole}
                  </p>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div>
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2" style={{ color: '#1F2937' }}>
                  <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
                  Fecha y Hora
                </h3>
                <div className="bg-[#F9FAFB] rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <p className="text-sm" style={{ color: '#4B5563' }}>
                      {formatDate(enrollment.date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalles según tipo */}
              {enrollment.type === 'MASIVO' ? (
                <>
                  <div>
                    <h3 className="font-semibold mb-3 text-lg flex items-center gap-2" style={{ color: '#1F2937' }}>
                      <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Detalles de la Carga
                    </h3>
                    <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Código de Lote
                        </p>
                        <p className="font-mono text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.loteCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Archivo Procesado
                        </p>
                        <p className="text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.fileName}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Total
                          </p>
                          <p className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                            {enrollment.totalRecords}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#10B981' }}>
                            Exitosos
                          </p>
                          <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                            {enrollment.successful}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#EF4444' }}>
                            Fallidos
                          </p>
                          <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>
                            {enrollment.failed}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {enrollment.programs && (
                    <div>
                      <h3 className="font-semibold mb-3 text-lg flex items-center gap-2" style={{ color: '#1F2937' }}>
                        <Users className="w-5 h-5" style={{ color: '#003DA5' }} />
                        Distribución por Programa
                      </h3>
                      <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-2">
                        {Object.entries(enrollment.programs).map(([program, count]) => (
                          <div key={program} className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: '#4B5563' }}>
                              {program}
                            </span>
                            <span className="font-semibold" style={{ color: '#1F2937' }}>
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <h3 className="font-semibold mb-3 text-lg flex items-center gap-2" style={{ color: '#1F2937' }}>
                    <User className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Usuario Creado
                  </h3>
                  <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                        Nombre Completo
                      </p>
                      <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                        {enrollment.userName}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Documento
                        </p>
                        <p className="text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.document}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Rol
                        </p>
                        <p className="text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.userRole}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                        Correo Institucional
                      </p>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" style={{ color: '#6B7280' }} />
                        <p className="text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Programa
                        </p>
                        <p className="text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.program}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Sede
                        </p>
                        <p className="text-sm" style={{ color: '#1F2937' }}>
                          {enrollment.sede}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div 
            className="px-8 py-6 border-t flex items-center justify-end gap-3"
            style={{ background: '#F9FAFB' }}
          >
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-medium text-sm"
              style={{
                background: '#003DA5',
                color: '#FFFFFF'
              }}
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}