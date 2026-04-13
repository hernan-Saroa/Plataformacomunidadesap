/**
 * ═══════════════════════════════════════════════════════════════
 * ERROR FALLBACK UI - PÁGINA DE ERROR AMIGABLE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Diseño tranquilizador para cuando algo sale mal
 * Inspirado en las mejores prácticas de UX/UI
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  RefreshCw,
  Home,
  Mail,
  Phone,
  Wrench,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ErrorFallbackUIProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset?: () => void;
}

export function ErrorFallbackUI({ error, errorInfo, onReset }: ErrorFallbackUIProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <Card className="p-8 md:p-12 shadow-2xl border-2 border-gray-200 bg-white/95 backdrop-blur-lg">
          {/* Header with Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6">
              <div className="text-[#003DA5] text-4xl font-bold">ESAP</div>
            </div>

            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: 0.2, 
                type: "spring", 
                stiffness: 200,
                damping: 15 
              }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#003DA5] to-[#0052CC] flex items-center justify-center mb-6 shadow-lg"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Wrench className="w-12 h-12 text-white" strokeWidth={2} />
              </motion.div>
            </motion.div>

            {/* Main Message */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-3">
              ¿Necesitas ayudarnos un poco?
            </h1>
            
            <p className="text-lg text-gray-600 text-center max-w-md mb-2">
              No pudimos mostrar esta sección. Sabemos que es molesto y estamos trabajando en la solución.
            </p>

            <p className="text-base text-gray-500 text-center max-w-md">
              Nuestro equipo técnico ya fue notificado y resolverá este inconveniente lo más pronto posible.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={handleReload}
              className="flex items-center justify-center gap-2 px-6 py-6 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-xl hover:shadow-lg transition-all text-base font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Recargar Página
            </Button>

            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex items-center justify-center gap-2 px-6 py-6 border-2 border-gray-300 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-base font-semibold"
            >
              <Home className="w-5 h-5" />
              Volver al Inicio
            </Button>
          </div>

          {/* Contact Support */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#003DA5]" />
              ¿Necesitas ayuda inmediata?
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#003DA5]" />
                </div>
                <div>
                  <p className="text-gray-600">Correo de soporte:</p>
                  <a 
                    href="mailto:soporte@esap.edu.co" 
                    className="text-[#003DA5] font-semibold hover:underline"
                  >
                    soporte@esap.edu.co
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-[#003DA5]" />
                </div>
                <div>
                  <p className="text-gray-600">Línea de atención:</p>
                  <a 
                    href="tel:+5713340550" 
                    className="text-[#003DA5] font-semibold hover:underline"
                  >
                    +57 (1) 334 0550
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Lamentamos las molestias. Estamos comprometidos con brindarte la mejor experiencia.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Código de error: ERR_{Date.now().toString(36).toUpperCase()}
            </p>
          </div>
        </Card>

        {/* Bottom Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600">
            ComUNIdad ESAP - Plataforma Unificada | © 2024
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}