/**
 * COMPONENTE: KeyboardShortcutsOnboarding
 * Tutorial de bienvenida que se muestra la primera vez que el usuario accede
 * Enseña los atajos de teclado básicos
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, ArrowLeft, ArrowRight, Command, Zap } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';

interface KeyboardShortcutsOnboardingProps {
  moduleColor?: string;
  moduleName?: string;
}

export function KeyboardShortcutsOnboarding({ 
  moduleColor = '#003DA5',
  moduleName = 'Control Interno Disciplinario'
}: KeyboardShortcutsOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Verificar si ya se mostró antes
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('keyboard-shortcuts-onboarding-seen');
    if (!hasSeenOnboarding) {
      // Mostrar después de 2 segundos
      setTimeout(() => setIsVisible(true), 2000);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('keyboard-shortcuts-onboarding-seen', 'true');
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem('keyboard-shortcuts-onboarding-seen', 'true');
    setIsVisible(false);
  };

  const steps = [
    {
      title: '⌨️ Navega más rápido',
      description: 'Usa el teclado para moverte entre secciones sin necesidad del mouse',
      keys: [
        { label: '←', description: 'Sección anterior' },
        { label: '→', description: 'Sección siguiente' }
      ],
      icon: <ArrowRight className="w-12 h-12" />
    },
    {
      title: '⚡ Acceso directo',
      description: 'Salta a cualquier sección instantáneamente',
      keys: [
        { label: 'Ctrl + 1-7', description: 'Ir a sección específica' }
      ],
      icon: <Zap className="w-12 h-12" />
    },
    {
      title: '💡 Ver todos los atajos',
      description: 'Presiona Ctrl+K en cualquier momento para ver la lista completa',
      keys: [
        { label: 'Ctrl + K', description: 'Abrir ayuda de atajos' }
      ],
      icon: <Keyboard className="w-12 h-12" />
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />

          {/* Card flotante */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-md relative overflow-hidden">
              {/* Barra de progreso */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
                <motion.div
                  className="h-full"
                  style={{ background: moduleColor }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className="p-6 border-b-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-500 mb-1">
                      {moduleName}
                    </h3>
                    <h2 className="text-xl font-bold text-gray-900">
                      Atajos de Teclado
                    </h2>
                  </div>
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Contenido animado */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  {/* Icono */}
                  <div 
                    className="p-4 rounded-2xl inline-flex mb-4"
                    style={{ background: `${moduleColor}15` }}
                  >
                    <div style={{ color: moduleColor }}>
                      {currentStepData.icon}
                    </div>
                  </div>

                  {/* Título y descripción */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {currentStepData.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {currentStepData.description}
                  </p>

                  {/* Atajos */}
                  <div className="space-y-3">
                    {currentStepData.keys.map((key, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">
                          {key.description}
                        </span>
                        <kbd
                          className="px-4 py-2 rounded-md font-mono text-sm font-bold shadow-sm border-2"
                          style={{
                            background: '#FFFFFF',
                            borderColor: '#E5E7EB',
                            color: moduleColor
                          }}
                        >
                          {key.label}
                        </kbd>
                      </div>
                    ))}
                  </div>

                  {/* Nota para Mac */}
                  {currentStep > 0 && (
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      💡 En Mac, usa <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Cmd</kbd> en lugar de <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl</kbd>
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer con navegación */}
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  {/* Indicadores de paso */}
                  <div className="flex items-center gap-2">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{
                          background: index === currentStep ? moduleColor : '#E5E7EB',
                          width: index === currentStep ? '24px' : '8px'
                        }}
                      />
                    ))}
                  </div>

                  {/* Botones */}
                  <div className="flex items-center gap-2">
                    {currentStep < steps.length - 1 ? (
                      <>
                        <Button
                          onClick={handleSkip}
                          variant="ghost"
                          size="sm"
                        >
                          Omitir
                        </Button>
                        <Button
                          onClick={() => setCurrentStep(currentStep + 1)}
                          size="sm"
                          className="font-bold"
                          style={{ background: moduleColor, color: '#FFFFFF' }}
                        >
                          Siguiente
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleComplete}
                        size="sm"
                        className="font-bold"
                        style={{ background: moduleColor, color: '#FFFFFF' }}
                      >
                        ¡Entendido!
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
