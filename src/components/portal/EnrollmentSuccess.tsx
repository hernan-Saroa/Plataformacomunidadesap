/**
 * PANTALLA 6: ÉXITO - CUENTA CREADA
 * Pantalla de celebración con resumen y redirección al login
 */

import { motion } from 'motion/react';
import { CheckCircle, Mail, User, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';

interface EnrollmentSuccessProps {
  userName: string;
  email: string;
  document: string;
  role: string;
  program: string;
  onGoToLogin: () => void;
}

export function EnrollmentSuccess({ 
  userName,
  email,
  document,
  role,
  program,
  onGoToLogin 
}: EnrollmentSuccessProps) {
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Countdown para redirección automática
  useEffect(() => {
    if (!autoRedirect) return;
    
    if (countdown <= 0) {
      onGoToLogin();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, autoRedirect, onGoToLogin]);

  // Confetti effect (simple with CSS)
  const confettiColors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex flex-col relative overflow-hidden">
      {/* Confetti Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              y: -20, 
              x: Math.random() * window.innerWidth,
              rotate: Math.random() * 360,
              opacity: 1
            }}
            animate={{ 
              y: window.innerHeight + 100,
              rotate: Math.random() * 360 + 720,
              opacity: 0
            }}
            transition={{ 
              duration: Math.random() * 3 + 3,
              delay: Math.random() * 0.5,
              ease: "linear"
            }}
            className={`absolute w-3 h-3 ${confettiColors[Math.floor(Math.random() * confettiColors.length)]} rounded-sm`}
            style={{ 
              left: Math.random() * 100 + '%',
            }}
          />
        ))}
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              y: [0, -30, -60],
            }}
            transition={{ 
              duration: 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatDelay: Math.random() * 3
            }}
            className="absolute"
            style={{
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2
            }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              {/* Pulsing background */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-green-500 rounded-full blur-xl"
              />
              
              {/* Icon container */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
                <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
              </div>

              {/* Badge */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              ¡Cuenta Creada!
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              ¡Bienvenido a ComUNIdad ESAP, <span className="font-bold text-[#003DA5]">{userName}</span>! 
              Tu cuenta ha sido activada exitosamente.
            </p>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mb-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-[#003DA5]" />
              Resumen de tu Cuenta
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Nombre Completo</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Correo Institucional</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{email}</p>
                </div>
              </div>

              {/* Document */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Documento</p>
                  <p className="text-sm font-semibold text-gray-900">{document}</p>
                </div>
              </div>

              {/* Role & Program */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rol</p>
                    <p className="text-sm font-semibold text-gray-900">{role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Programa</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{program}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            {/* Primary Button */}
            <Button
              onClick={onGoToLogin}
              className="w-full h-14 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group"
            >
              <span>Iniciar Sesión Ahora</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Auto-redirect message */}
            {autoRedirect && countdown > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-sm text-gray-500">
                  Redirigiendo automáticamente en{' '}
                  <span className="font-bold text-[#003DA5]">{countdown}</span> segundos
                </p>
                <button
                  onClick={() => setAutoRedirect(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline mt-1"
                >
                  Cancelar redirección
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-lg"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Próximos Pasos
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Inicia sesión con tu correo y la contraseña que creaste</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">→</span>
                <span>Completa tu perfil con información adicional</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">→</span>
                <span>Explora todas las funcionalidades de ComUNIdad</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">→</span>
                <span>Conéctate con la comunidad ESAP</span>
              </li>
            </ul>
          </motion.div>

          {/* Support */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-gray-500">
              ¿Necesitas ayuda?{' '}
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
