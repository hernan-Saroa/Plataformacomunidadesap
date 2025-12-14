/**
 * PANTALLA 2: VALIDACIÓN DE DOCUMENTO
 * Usuario ingresa su cédula para verificar si existe en el sistema
 */

import { motion } from 'motion/react';
import { CreditCard, ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';

interface EnrollmentDocumentValidationProps {
  onBack: () => void;
  onValidate: (document: string) => void;
  isValidating: boolean;
}

export function EnrollmentDocumentValidation({ 
  onBack, 
  onValidate,
  isValidating 
}: EnrollmentDocumentValidationProps) {
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');

  const handleDocumentChange = (value: string) => {
    // Solo permitir números
    const cleaned = value.replace(/\D/g, '');
    setDocument(cleaned);
    
    // Limpiar error al escribir
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!document) {
      setError('Por favor ingresa tu número de documento');
      return;
    }
    
    if (document.length < 6) {
      setError('El documento debe tener al menos 6 dígitos');
      return;
    }
    
    if (document.length > 12) {
      setError('El documento no puede tener más de 12 dígitos');
      return;
    }
    
    // Todo OK, proceder
    onValidate(document);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
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
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#003DA5] rounded-full flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div className="w-16 h-1 bg-gray-200" />
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm font-bold">
                2
              </div>
              <div className="w-16 h-1 bg-gray-200" />
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm font-bold">
                3
              </div>
            </div>
            <p className="text-center text-xs text-gray-500">
              Paso 1 de 3: Validación de documento
            </p>
          </motion.div>

          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Header Card */}
            <div className="bg-gradient-to-br from-[#003DA5] to-[#0052CC] p-8 text-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4"
              >
                <CreditCard className="w-10 h-10" strokeWidth={2.5} />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2">
                Valida tu Documento
              </h2>
              <p className="text-white/90 text-sm">
                Ingresa tu número de cédula para verificar tu información
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              {/* Input de Documento */}
              <div className="mb-6">
                <label 
                  htmlFor="document" 
                  className="block text-sm font-semibold text-gray-900 mb-3"
                >
                  Número de Documento
                </label>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  
                  <input
                    type="text"
                    id="document"
                    value={document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    placeholder="Ej: 1234567890"
                    disabled={isValidating}
                    className={`w-full h-14 pl-14 pr-4 text-lg font-medium border-2 rounded-xl transition-all ${
                      error 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100'
                    } ${isValidating ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    style={{ outline: 'none' }}
                    autoFocus
                    maxLength={12}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 text-red-600"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                {/* Helper Text */}
                {!error && (
                  <p className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Tu información está protegida y será validada de forma segura
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isValidating || !document}
                className="w-full h-14 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <span>Validar Documento</span>
                    <svg 
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </Button>

              {/* Info Footer */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#003DA5]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#003DA5] mb-1">¿Qué validamos?</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Verificamos que tu documento esté en nuestro sistema</li>
                      <li>• Validamos tu elegibilidad para activar tu cuenta</li>
                      <li>• Confirmamos tu correo institucional</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Help Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-gray-500">
              ¿No tienes cédula o tienes problemas?{' '}
              <a href="#" className="text-[#003DA5] font-medium hover:underline">
                Contacta soporte
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
