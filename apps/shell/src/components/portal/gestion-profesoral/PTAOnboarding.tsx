// Onboarding Progresivo para el PTA
// 4 pasos que guían al docente en su primer uso

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface PTAOnboardingProps {
  docenteNombre: string;
  vinculacion: string;
  territorial: string;
  horasBase: number;
  periodo: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function PTAOnboarding({
  docenteNombre,
  vinculacion,
  territorial,
  horasBase,
  periodo,
  onComplete,
  onSkip
}: PTAOnboardingProps) {
  const [pasoActual, setPasoActual] = useState(0);

  const pasos = [
    {
      titulo: `¡Bienvenido, ${docenteNombre}!`,
      emoji: '👋',
      contenido: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-gray-900">
            ¡Bienvenido, {docenteNombre}!
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Este es tu espacio para planificar tu trabajo académico.
            Te guiaremos paso a paso.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 max-w-lg mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">📋</span> Tu información
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Vinculación:</span>
                <span className="text-sm font-medium text-gray-900">{vinculacion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Territorial:</span>
                <span className="text-sm font-medium text-gray-900">{territorial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Horas base:</span>
                <span className="text-sm font-medium text-gray-900">{horasBase} horas/año</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Periodo:</span>
                <span className="text-sm font-medium text-gray-900">{periodo}</span>
              </div>
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-700 mt-4">
              ¿Algo incorrecto? Reportar
            </button>
          </div>
        </div>
      )
    },
    {
      titulo: 'Los 4 Componentes del PTA',
      emoji: '🎯',
      contenido: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tu PTA tiene 4 componentes
            </h2>
            <p className="text-gray-600">
              Así se distribuyen tus {horasBase} horas:
            </p>
          </div>
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔵</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">DOCENCIA</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clases que dictarás
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Sin límite</p>
                  <p className="text-xs text-gray-600">(obligatorio mín. 3 créd.)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🟠</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">INVESTIGACIÓN</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Proyectos, artículos
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Hasta 50%</p>
                  <p className="text-xs text-gray-600">({horasBase / 2}h)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🟣</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">EXTENSIÓN</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Capacitaciones, asesorías
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Hasta 25%</p>
                  <p className="text-xs text-gray-600">({horasBase / 4}h)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🟢</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">COMPLEMENTARIAS</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Tutorías, comités, otros
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Hasta 25%</p>
                  <p className="text-xs text-gray-600">({horasBase / 4}h)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-amber-900">
              <span className="font-medium">💡 Tip:</span> Empieza por Docencia. Es obligatorio tener al menos
              una asignatura de 3 créditos para desbloquear los demás.
            </p>
          </div>
        </div>
      )
    },
    {
      titulo: 'Cómo agregar una asignatura',
      emoji: '📚',
      contenido: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Practiquemos agregando una asignatura
            </h2>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-2xl mx-auto">
            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">Selecciona el programa</p>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option>APT - Administración Pública Territorial</option>
                      <option>AP - Administración Pública</option>
                      <option>Maestría en Gobierno</option>
                    </select>
                  </div>
                </div>
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-300" />
              </div>
              
              <div className="relative">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">Busca la asignatura</p>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="🔍 Gestión Pública"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-300" />
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-2">El sistema calcula automáticamente</p>
                  <div className="bg-white border border-gray-300 rounded-lg p-3">
                    <p className="text-sm text-gray-900 font-mono">
                      3 créd × 16h × 3 = <span className="font-bold text-[#003DA5]">144 horas</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-blue-900">
              <span className="font-medium">✨ Magia:</span> El sistema calcula automáticamente las horas según
              la fórmula oficial de la Circular Dispositiva 003/2025.
            </p>
          </div>
        </div>
      )
    },
    {
      titulo: '¡Listo para comenzar!',
      emoji: '🚀',
      contenido: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-gray-900">
            ¡Listo!
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Ahora puedes comenzar a construir tu PTA.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 max-w-lg mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">📌</span> Recuerda:
            </h3>
            <ul className="space-y-3 text-left text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Tu trabajo se guarda automáticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Puedes salir y continuar después</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Tienes hasta el 15 de diciembre para enviar a aprobación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Si tienes dudas, presiona ? en cualquier momento</span>
              </li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="text-sm text-[#003DA5] hover:underline">
              Ver video tutorial
            </button>
          </div>
        </div>
      )
    }
  ];

  const irSiguiente = () => {
    if (pasoActual < pasos.length - 1) {
      setPasoActual(pasoActual + 1);
    } else {
      onComplete();
    }
  };

  const irAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pasos[pasoActual].emoji}</span>
            <h2 className="text-lg font-semibold text-gray-900">
              {pasos[pasoActual].titulo}
            </h2>
          </div>
          <button
            onClick={onSkip}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pasoActual}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {pasos[pasoActual].contenido}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Indicadores de paso */}
            <div className="flex gap-2">
              {pasos.map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${index === pasoActual 
                      ? 'w-8 bg-[#003DA5]' 
                      : index < pasoActual
                      ? 'bg-[#003DA5]'
                      : 'bg-gray-300'
                    }
                  `}
                />
              ))}
            </div>

            {/* Botones de navegación */}
            <div className="flex gap-3">
              {pasoActual > 0 && (
                <button
                  onClick={irAnterior}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Atrás
                </button>
              )}
              
              <button
                onClick={irSiguiente}
                className="px-6 py-2 text-sm bg-[#003DA5] text-white hover:bg-[#002875] rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                {pasoActual < pasos.length - 1 ? (
                  <>
                    Continuar
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Comenzar ahora
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Checkbox "No mostrar de nuevo" */}
          {pasoActual === pasos.length - 1 && (
            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" id="noMostrar" className="rounded" />
              <label htmlFor="noMostrar" className="text-sm text-gray-600">
                No mostrar esto de nuevo
              </label>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
