/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOOLTIP GUÍA - MÓDULO CONTROL INTERNO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente de tooltip discreto ubicado en la parte superior derecha
 * para guiar al usuario sobre la funcionalidad de cada módulo.
 * 
 * VERSIÓN: 1.0
 * FECHA: 4 Enero 2026
 */

import { useState } from 'react';
import { HelpCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipGuiaProps {
  titulo: string;
  descripcion: string;
  pasos?: string[];
  tips?: string[];
  video?: string; // URL de video tutorial (opcional)
}

export function TooltipGuia({ titulo, descripcion, pasos, tips, video }: TooltipGuiaProps) {
  const [mostrarTooltip, setMostrarTooltip] = useState(false);

  return (
    <div className="relative">
      {/* Botón discreto */}
      <button
        onClick={() => setMostrarTooltip(!mostrarTooltip)}
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${mostrarTooltip 
            ? 'bg-blue-100 text-blue-700 shadow-md' 
            : 'bg-white/80 text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
          }
        `}
        title="Ver guía de ayuda"
      >
        <HelpCircle className={`w-4 h-4 ${mostrarTooltip ? '' : 'group-hover:animate-pulse'}`} />
        <span className="text-xs font-medium hidden sm:inline">Ayuda</span>
      </button>

      {/* Panel de Tooltip */}
      <AnimatePresence>
        {mostrarTooltip && (
          <>
            {/* Overlay para cerrar al hacer clic fuera */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setMostrarTooltip(false)}
            />
            
            {/* Panel de contenido */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-[9999] w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">{titulo}</h3>
                      <p className="text-xs text-blue-100">{descripcion}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMostrarTooltip(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5 max-h-[500px] overflow-y-auto">
                {/* Pasos */}
                {pasos && pasos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs">
                        1
                      </span>
                      Cómo usar este módulo
                    </h4>
                    <ol className="space-y-2">
                      {pasos.map((paso, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="w-6 h-6 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="flex-1">{paso}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Tips */}
                {tips && tips.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs">
                        💡
                      </span>
                      Consejos útiles
                    </h4>
                    <ul className="space-y-2">
                      {tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="text-amber-600 flex-shrink-0 mt-1">•</span>
                          <span className="flex-1">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Video Tutorial */}
                {video && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs">
                        ▶
                      </span>
                      Video tutorial
                    </h4>
                    <a
                      href={video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg text-sm text-purple-700 font-medium hover:shadow-md transition-all text-center"
                    >
                      Ver tutorial en video
                    </a>
                  </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    ¿Necesitas más ayuda? Contacta al equipo de soporte técnico
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
