/**
 * BANNER DE CONTEXTO UNIVERSITARIO
 * Componente que se muestra en el módulo de AE para recordar el contexto académico
 */

import { GraduationCap, BookOpen, Info, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { GuiaContextoUniversitario } from './GuiaContextoUniversitario';

export function BannerContextoUniversitario() {
  const [showGuia, setShowGuia] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-[#003DA5]" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    🎓 Módulo Perfilado para Instituciones de Educación Superior
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    Este módulo está adaptado al contexto de <strong>ESAP</strong> como universidad, 
                    no como empresa tradicional. Los lineamientos MRAE v3.0 MinTIC se aplican a procesos 
                    académicos (docencia, investigación, extensión).
                  </p>
                </div>
                
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1 hover:bg-blue-200 rounded transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mt-3">
                {/* Stats rápidos */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200">
                  <span className="text-xs text-gray-600">Estudiantes:</span>
                  <span className="text-xs font-bold text-[#003DA5]">45,000</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200">
                  <span className="text-xs text-gray-600">Docentes:</span>
                  <span className="text-xs font-bold text-[#003DA5]">2,500</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200">
                  <span className="text-xs text-gray-600">Territoriales:</span>
                  <span className="text-xs font-bold text-[#003DA5]">17</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200">
                  <span className="text-xs text-gray-600">CETAPs:</span>
                  <span className="text-xs font-bold text-[#003DA5]">307</span>
                </div>

                <Button
                  onClick={() => setShowGuia(true)}
                  className="ml-auto px-4 py-1.5 bg-[#003DA5] hover:bg-[#002d7a] text-white text-xs rounded-lg flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Ver Guía Completa
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Modal de Guía */}
      <AnimatePresence>
        {showGuia && (
          <GuiaContextoUniversitario onClose={() => setShowGuia(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * TOOLTIP CONTEXTUAL PARA LINEAMIENTOS
 * Muestra información específica del contexto universitario al pasar el mouse
 */
export function TooltipContextoUniversitario({ 
  lineamientoCodigo,
  children 
}: { 
  lineamientoCodigo: string;
  children: React.ReactNode;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Mapeo de ejemplos por lineamiento
  const ejemplosUniversitarios: Record<string, string> = {
    'MAE.LI.ES.01': '📚 Ejemplo ESAP: Análisis del sector educativo superior en Colombia',
    'MAE.LI.ES.02': '🎯 Ejemplo ESAP: Alineación con misión educativa de formación en administración pública',
    'MAE.LI.NE.01': '📖 Ejemplo ESAP: Arquitectura de procesos de docencia, investigación y extensión',
    'MAE.LI.NE.02': '🎓 Ejemplo ESAP: Capacidades para ofrecer pregrado, especialización, maestría y doctorado',
    'MAE.LI.NE.03': '💻 Ejemplo ESAP: Portal estudiantil, matrícula en línea, consulta de notas',
    'MGGTI.LI.GAN.01': '🖥️ Ejemplo ESAP: Sistema de Gestión Académica (SGA), LMS Moodle, Portal Estudiantil',
    'MGGTI.LI.GAN.03': '📊 Ejemplo ESAP: Disponibilidad ≥99.5% del SGA en períodos de matrícula',
    'MGGTI.LI.SI.01': '🔒 Ejemplo ESAP: Política de protección de historiales académicos y datos estudiantiles',
    'MGGTI.LI.SI.02': '🛡️ Ejemplo ESAP: Autenticación 2FA para docentes que ingresan calificaciones',
  };

  const ejemplo = ejemplosUniversitarios[lineamientoCodigo];

  if (!ejemplo) return <>{children}</>;

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 bottom-full left-0 mb-2 w-80"
          >
            <div className="bg-[#003DA5] text-white px-4 py-3 rounded-lg shadow-xl border-2 border-blue-300">
              <div className="flex items-start gap-2">
                <GraduationCap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold mb-1">Contexto Universitario</p>
                  <p className="text-xs">{ejemplo}</p>
                </div>
              </div>
              {/* Flecha */}
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-3 h-3 bg-[#003DA5] border-r-2 border-b-2 border-blue-300"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * BADGE DE CONTEXTO
 * Badge pequeño que indica que hay información contextual disponible
 */
export function BadgeContextoUniversitario({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 rounded-full text-xs font-semibold transition-colors"
      title="Ver contexto universitario"
    >
      <GraduationCap className="w-3 h-3" />
      <span>ESAP</span>
      <Info className="w-3 h-3" />
    </button>
  );
}
