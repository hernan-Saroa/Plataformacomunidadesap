/**
 * ═══════════════════════════════════════════════════════════════
 * LOADING ERROR UI - PÁGINA DE ERROR DE CARGA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Para errores de red, timeouts o problemas de carga de recursos
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  WifiOff,
  RefreshCw,
  Home,
  AlertCircle,
  Signal,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface LoadingErrorUIProps {
  type?: 'network' | 'timeout' | 'resource' | 'unknown';
  message?: string;
  onRetry?: () => void;
}

export function LoadingErrorUI({ 
  type = 'unknown', 
  message,
  onRetry 
}: LoadingErrorUIProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const getErrorContent = () => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff className="w-12 h-12 text-white" strokeWidth={2} />,
          title: 'Sin conexión a internet',
          description: 'Parece que no tienes conexión. Verifica tu red e intenta nuevamente.',
          gradient: 'from-orange-500 to-red-500',
        };
      case 'timeout':
        return {
          icon: <Signal className="w-12 h-12 text-white" strokeWidth={2} />,
          title: 'La carga está tomando más tiempo de lo esperado',
          description: 'El servidor está tardando en responder. Intenta recargar la página.',
          gradient: 'from-yellow-500 to-orange-500',
        };
      case 'resource':
        return {
          icon: <AlertCircle className="w-12 h-12 text-white" strokeWidth={2} />,
          title: 'No pudimos cargar algunos recursos',
          description: 'Algunos archivos no se cargaron correctamente. Intenta recargar.',
          gradient: 'from-purple-500 to-pink-500',
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-white" strokeWidth={2} />,
          title: 'Algo no salió como esperábamos',
          description: 'Estamos trabajando para resolver este inconveniente.',
          gradient: 'from-[#003DA5] to-[#0052CC]',
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      {/* Animated Background */}
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
            className={`w-24 h-24 rounded-full bg-gradient-to-br ${content.gradient} flex items-center justify-center mb-6 shadow-lg mx-auto`}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [1, 0.8, 1] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              {content.icon}
            </motion.div>
          </motion.div>

          {/* Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {content.title}
            </h1>
            
            <p className="text-lg text-gray-600 max-w-md mx-auto mb-2">
              {content.description}
            </p>

            {message && (
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                {message}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={onRetry || handleReload}
              className="flex items-center justify-center gap-2 px-6 py-6 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-xl hover:shadow-lg transition-all text-base font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Intentar Nuevamente
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

          {/* Tips Section */}
          {type === 'network' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">
                💡 Sugerencias para resolver el problema:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#003DA5] font-bold mt-0.5">•</span>
                  <span>Verifica que tu dispositivo esté conectado a internet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#003DA5] font-bold mt-0.5">•</span>
                  <span>Intenta cambiar de red WiFi o usar datos móviles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#003DA5] font-bold mt-0.5">•</span>
                  <span>Reinicia tu router si estás usando WiFi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#003DA5] font-bold mt-0.5">•</span>
                  <span>Contacta a tu proveedor de internet si el problema persiste</span>
                </li>
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Si el problema continúa, contáctanos en{' '}
              <a 
                href="mailto:soporte@esap.edu.co" 
                className="text-[#003DA5] font-semibold hover:underline"
              >
                soporte@esap.edu.co
              </a>
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