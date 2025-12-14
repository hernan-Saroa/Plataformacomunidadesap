/**
 * PANTALLA 4a: DOCUMENTO NO ENCONTRADO (Error)
 * Se muestra cuando el documento no está en el sistema
 */

import { motion } from 'motion/react';
import { XCircle, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface EnrollmentDocumentErrorProps {
  document: string;
  onRetry: () => void;
  onBack: () => void;
}

export function EnrollmentDocumentError({ 
  document, 
  onRetry,
  onBack 
}: EnrollmentDocumentErrorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {/* Header con logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-white shadow-sm py-6"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Botón Atrás */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-[#003DA5] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Atrás</span>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#003DA5] to-[#0052CC] rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">ESAP</span>
              </div>
            </div>

            {/* Espaciador */}
            <div className="w-16" />
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Icon Section */}
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6"
              >
                <XCircle className="w-12 h-12 text-red-600" strokeWidth={2} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Documento No Encontrado
                </h2>
                <p className="text-base text-gray-600 leading-relaxed mb-2">
                  No pudimos encontrar el documento <span className="font-bold text-gray-900">{document}</span> en nuestro sistema.
                </p>
                <p className="text-sm text-gray-500">
                  Esto puede deberse a varias razones
                </p>
              </motion.div>
            </div>

            {/* Razones Posibles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="px-8 pb-6"
            >
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                <p className="text-sm font-semibold text-orange-900 mb-3">
                  Posibles causas:
                </p>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>El número de documento no está registrado en el sistema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Aún no has sido asignado a un programa académico</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Tu proceso de admisión está pendiente de aprobación</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Digitaste incorrectamente el número de documento</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-8 space-y-3"
            >
              {/* Retry Button */}
              <Button
                onClick={onRetry}
                className="w-full h-14 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Intentar de Nuevo</span>
              </Button>

              {/* Contact Support */}
              <button
                onClick={() => window.open('mailto:soporte@esap.edu.co', '_blank')}
                className="w-full h-14 bg-white hover:bg-gray-50 text-gray-700 font-medium text-base rounded-xl border-2 border-gray-200 hover:border-[#003DA5] transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <Mail className="w-5 h-5 text-gray-500 group-hover:text-[#003DA5] transition-colors" />
                <span>Contactar Soporte</span>
              </button>
            </motion.div>

            {/* Help Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="px-8 pb-8"
            >
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#003DA5]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#003DA5] mb-1">
                      ¿Necesitas ayuda?
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Si crees que tu documento debería estar en el sistema, contacta a tu coordinador de programa o escribe a{' '}
                      <a href="mailto:soporte@esap.edu.co" className="text-[#003DA5] font-medium hover:underline">
                        soporte@esap.edu.co
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-center"
          >
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-[#003DA5] font-medium transition-colors"
            >
              ← Volver al inicio
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
