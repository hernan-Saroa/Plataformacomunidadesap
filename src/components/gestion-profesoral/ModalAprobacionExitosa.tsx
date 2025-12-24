import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, Mail, User, FileText, Calendar } from 'lucide-react';
import { ButtonSIGL } from '../esap/gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../esap/gestion-legal/design-system/BadgeSIGL';

interface PTA {
  id: string;
  codigo: string;
  docente: {
    nombre: string;
    email: string;
    documento: string;
    programa: string;
  };
  periodo: string;
  estado: string;
  fecha_aprobacion?: string;
}

interface ModalAprobacionExitosaProps {
  isOpen: boolean;
  onClose: () => void;
  pta: PTA | null;
  aprobador?: {
    nombre: string;
    rol: string;
  };
}

export function ModalAprobacionExitosa({ 
  isOpen, 
  onClose, 
  pta,
  aprobador = {
    nombre: 'Coordinador Académico',
    rol: 'Nivel 1 - Coordinación Académica'
  }
}: ModalAprobacionExitosaProps) {
  if (!isOpen || !pta) return null;

  const emailsEnviados = [
    {
      destinatario: pta.docente.nombre,
      email: pta.docente.email,
      tipo: 'Docente'
    },
    {
      destinatario: aprobador.nombre,
      email: 'coordinacion.academica@esap.edu.co',
      tipo: 'Coordinador'
    },
    {
      destinatario: 'Dirección de Programación Académica',
      email: 'programacion.academica@esap.edu.co',
      tipo: 'Dirección'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header con animación de éxito */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-6 text-white relative overflow-hidden">
            {/* Partículas de éxito (decorativas) */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-10 w-2 h-2 bg-white rounded-full animate-ping" />
              <div className="absolute top-8 right-20 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute bottom-6 left-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
            </div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold"
                  >
                    ¡PTA Aprobado Exitosamente!
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-white/90 mt-1"
                  >
                    El Plan de Trabajo Académico ha sido aprobado
                  </motion.p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* PTA Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 mb-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{pta.codigo}</h3>
                      <BadgeSIGL variant="success" className="mt-1">
                        ✓ APROBADO
                      </BadgeSIGL>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Periodo</p>
                      <p className="text-sm font-medium text-gray-900">{pta.periodo}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {/* Docente */}
                    <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Docente</p>
                        <p className="font-medium text-gray-900">{pta.docente.nombre}</p>
                        <p className="text-sm text-gray-600">{pta.docente.email}</p>
                      </div>
                    </div>

                    {/* Programa */}
                    <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Programa</p>
                        <p className="font-medium text-gray-900">{pta.docente.programa}</p>
                      </div>
                    </div>

                    {/* Fecha de aprobación */}
                    <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Fecha de Aprobación</p>
                        <p className="font-medium text-gray-900">
                          {pta.fecha_aprobacion 
                            ? new Date(pta.fecha_aprobacion).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : new Date().toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Notificaciones enviadas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-[#003DA5]" />
                <h3 className="font-bold text-gray-900">Notificaciones Enviadas</h3>
              </div>

              <div className="space-y-2">
                {emailsEnviados.map((email, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (index * 0.1) }}
                    className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <div className="w-8 h-8 bg-[#003DA5] rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{email.destinatario}</p>
                        <BadgeSIGL variant="default" className="text-xs">
                          {email.tipo}
                        </BadgeSIGL>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{email.email}</p>
                    </div>
                    <div className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Enviado</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Información adicional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">📧</div>
                <div>
                  <p className="font-medium text-gray-900 mb-2">
                    Correos electrónicos enviados
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✓ El docente ha sido notificado de la aprobación</li>
                    <li>✓ El coordinador ha recibido confirmación del proceso</li>
                    <li>✓ La dirección de programación tiene registro del PTA aprobado</li>
                    <li>✓ El PTA ahora está en estado <span className="font-semibold text-green-700">APROBADO</span></li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Próximos pasos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">💡</div>
                <div>
                  <p className="font-medium text-amber-900 mb-2">Próximos Pasos</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>→ El PTA queda registrado en el sistema como aprobado</li>
                    <li>→ El docente puede consultar su PTA aprobado en cualquier momento</li>
                    <li>→ Se puede exportar el documento oficial para archivo institucional</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <ButtonSIGL
              variant="primary"
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Entendido
            </ButtonSIGL>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
