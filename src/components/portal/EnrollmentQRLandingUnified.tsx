/**
 * ENROLAMIENTO QR - DISEÑO UNIFICADO
 * Usa el mismo estilo visual que el Formulario de Vinculaciones
 * - Badge verde "Proceso de Activación 100% Digital"
 * - Título grande con "ESAP" en azul
 * - Card azul con stepper integrado
 * - Diseño limpio y uniforme
 */

import { motion } from 'motion/react';
import { ArrowLeft, CreditCard, Mail, Lock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { EnrollmentActivationModal } from './EnrollmentActivationModal';
import { PublicNavbar } from './PublicNavbar';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface EnrollmentQRLandingUnifiedProps {
  onBeginActivation: () => void;
  onBackToHome?: () => void;
  onLoginClick?: () => void;
}

export function EnrollmentQRLandingUnified({ onBeginActivation, onBackToHome, onLoginClick }: EnrollmentQRLandingUnifiedProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = (userData: any) => {
    console.log('✅ Usuario activado:', userData);
    onBeginActivation();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Public Navbar */}
      {onBackToHome && onLoginClick && (
        <PublicNavbar 
          onLoginClick={onLoginClick}
          onNavigateToHome={onBackToHome}
        />
      )}

      {/* Main Content - con padding-top para el navbar flotante */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pt-24 sm:pt-28">
        {/* Botón Volver - Diseño Premium */}
        {onBackToHome && (
          <motion.button
            onClick={onBackToHome}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#1e5da8] border-2 border-gray-200 hover:border-[#1e5da8] text-gray-700 hover:text-white transition-all duration-200 font-semibold shadow-sm hover:shadow-md mb-8"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Volver al Inicio</span>
          </motion.button>
        )}

        {/* Badge Verde */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Proceso de Activación 100% Digital</span>
          </div>
        </motion.div>

        {/* Título Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
            Activación de Cuenta{' '}
            <span style={{ color: '#003DA5' }}>ESAP</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mt-4">
            Inicia tu proceso de activación en pocos minutos. Respuesta inmediata.
          </p>
        </motion.div>

        {/* Card Azul Principal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Header Azul */}
            <div 
              className="p-6 sm:p-8 text-white"
              style={{ 
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' 
              }}
            >
              <div className="flex items-center gap-3 mb-1">
                <CreditCard className="w-6 h-6" />
                <h2 className="text-xl sm:text-2xl font-bold">Activación de Cuenta</h2>
              </div>
              <p className="text-white/90 text-sm sm:text-base">
                Completa el proceso para acceder a la plataforma
              </p>
            </div>

            {/* Contenido */}
            <div className="p-6 sm:p-8 lg:p-10">
              {/* Stepper Visual */}
              <div className="mb-10">
                <div className="flex items-center justify-between relative">
                  {/* Línea conectora - Desktop */}
                  <div className="hidden sm:block absolute top-4 left-0 w-full h-0.5 bg-gray-200" style={{ zIndex: 0 }}>
                    <div className="h-full bg-[#003DA5]" style={{ width: '0%' }}></div>
                  </div>

                  {/* Steps */}
                  <div className="flex items-center justify-between w-full relative" style={{ zIndex: 1 }}>
                    {/* Paso 1: Documento */}
                    <div className="flex flex-col items-center flex-1">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow-md"
                        style={{ backgroundColor: '#003DA5', color: 'white' }}
                      >
                        1
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Documento</span>
                    </div>

                    {/* Paso 2: Código */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-500 mb-2">
                        2
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Código</span>
                    </div>

                    {/* Paso 3: Contraseña */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-500 mb-2">
                        3
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Contraseña</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Iconos decorativos con los 3 pasos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                {/* Paso 1 */}
                <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Ingresa tu cédula</h3>
                  <p className="text-xs text-gray-600">Validamos tu información en nuestro sistema</p>
                </div>

                {/* Paso 2 */}
                <div className="flex flex-col items-center text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Verifica tu correo</h3>
                  <p className="text-xs text-gray-600">Te enviamos un código de confirmación</p>
                </div>

                {/* Paso 3 */}
                <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-3 shadow-lg">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Crea tu contraseña</h3>
                  <p className="text-xs text-gray-600">Protege tu cuenta con una clave segura</p>
                </div>
              </div>

              {/* Info adicional */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">¿Qué puedo esperar después de activar?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Acceso inmediato a tu panel de estudiante, docente o graduado</li>
                      <li>Visualización de tus datos académicos y perfil completo</li>
                      <li>Gestión de certificados, solicitudes y trámites digitales</li>
                      <li>Conexión con la comunidad ESAP</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botón de Acción Principal */}
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ 
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  color: 'white'
                }}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Comenzar Activación
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>

              {/* Texto inferior */}
              <p className="text-center text-xs text-gray-500 mt-4">
                🔒 Proceso 100% seguro. Tus datos están protegidos según normativa colombiana de protección de datos.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Beneficios Adicionales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto mt-8 sm:mt-12"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="font-semibold text-gray-900 text-sm">Activación Instantánea</p>
              <p className="text-xs text-gray-600 mt-1">En menos de 3 minutos</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-2">📱</div>
              <p className="font-semibold text-gray-900 text-sm">100% Móvil</p>
              <p className="text-xs text-gray-600 mt-1">Desde cualquier dispositivo</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-2">🔐</div>
              <p className="font-semibold text-gray-900 text-sm">Totalmente Seguro</p>
              <p className="text-xs text-gray-600 mt-1">Protección de datos garantizada</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal de Activación */}
      <EnrollmentActivationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}