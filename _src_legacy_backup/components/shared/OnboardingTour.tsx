import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ArrowRight, X, Check, ChevronLeft, ChevronRight,
  Zap, Search, HelpCircle, BarChart3, Users, Award
} from 'lucide-react';
import { Button } from '../ui/button';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  targetElement?: string; // ID del elemento a destacar
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  context: 'backoffice' | 'portal' | 'public';
  onComplete: () => void;
}

export function OnboardingTour({ context, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Steps según contexto
  const tourSteps: Record<string, OnboardingStep[]> = {
    backoffice: [
      {
        id: 'welcome',
        title: '¡Bienvenido al Backoffice ESAP! 🎉',
        description: 'Conoce las funciones principales en 30 segundos. Usa las flechas para navegar o presiona Esc para saltar.',
        icon: Sparkles,
        position: 'center',
      },
      {
        id: 'search',
        title: 'Búsqueda Rápida (Cmd+K)',
        description: 'Presiona Cmd+K (Mac) o Ctrl+K (Windows) para buscar módulos, usuarios o acciones al instante.',
        icon: Search,
        position: 'top',
      },
      {
        id: 'modules',
        title: 'Navegación por Módulos',
        description: 'Accede a Usuarios, Roles, Auditoría y Reportes desde el menú lateral izquierdo.',
        icon: Users,
        position: 'left',
      },
      {
        id: 'dashboard',
        title: 'Dashboard Ejecutivo',
        description: 'Visualiza métricas clave, KPIs y estadísticas en tiempo real de toda la plataforma.',
        icon: BarChart3,
        position: 'center',
      },
      {
        id: 'shortcuts',
        title: 'Atajos de Teclado',
        description: 'Presiona ? para ver todos los atajos disponibles. Cmd+N crea usuarios/roles según el módulo actual.',
        icon: Zap,
        position: 'center',
      },
    ],
    portal: [
      {
        id: 'welcome',
        title: '¡Bienvenido al Portal Estudiantil! 🎓',
        description: 'Tu hub central para todo: calificaciones, pagos, matrícula y más. Te mostramos lo esencial.',
        icon: Sparkles,
        position: 'center',
      },
      {
        id: 'modules',
        title: 'Tus Módulos Principales',
        description: 'Accede rápido a Académico, Financiero, Matrícula, Documentos, Biblioteca y Soporte.',
        icon: Award,
        position: 'center',
      },
      {
        id: 'search',
        title: 'Búsqueda Inteligente',
        description: 'Usa Cmd+K o Ctrl+K para encontrar cualquier cosa al instante: materias, certificados, pagos...',
        icon: Search,
        position: 'top',
      },
      {
        id: 'notifications',
        title: 'Notificaciones Importantes',
        description: 'Recibe alertas de calificaciones, pagos pendientes y nuevos recursos académicos.',
        icon: Sparkles,
        position: 'top',
      },
      {
        id: 'help',
        title: 'Soporte Estudiantil 24/7',
        description: 'El botón de ayuda (abajo a la derecha) te conecta con chat, tutoriales y soporte técnico.',
        icon: HelpCircle,
        position: 'bottom',
      },
    ],
    public: [
      {
        id: 'welcome',
        title: '¡Bienvenido a ESAP! 🏛️',
        description: 'La primera ComUNIdad Universitaria de Colombia. Te mostramos cómo navegar.',
        icon: Sparkles,
        position: 'center',
      },
      {
        id: 'services',
        title: 'Servicios Disponibles',
        description: 'Verifica títulos, solicita certificados o inicia tu proceso de vinculación desde el menú Servicios.',
        icon: Award,
        position: 'top',
      },
      {
        id: 'login',
        title: 'Acceso Rápido',
        description: 'Inicia sesión con tu correo institucional (@esap.edu.co para estudiantes, @esap.edu.co para administrativos).',
        icon: Users,
        position: 'top',
      },
      {
        id: 'help',
        title: 'Ayuda Disponible',
        description: 'Usa el botón de ayuda flotante para contactar asesores, ver demos o llamar directamente.',
        icon: HelpCircle,
        position: 'bottom',
      },
    ],
  };

  const steps = tourSteps[context] || tourSteps.public;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Auto-guardar que completó el tour
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem(`onboarding-completed-${context}`);
    if (hasCompletedTour) {
      setIsVisible(false);
    }
  }, [context]);

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem(`onboarding-completed-${context}`, 'true');
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] pointer-events-none"
      >
        {/* Overlay con spotlight */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleSkip} />

        {/* Card del tour */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`absolute pointer-events-auto max-w-md mx-4 ${
            currentStepData.position === 'center'
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
              : currentStepData.position === 'top'
              ? 'top-4 sm:top-24 left-1/2 -translate-x-1/2'
              : currentStepData.position === 'bottom'
              ? 'bottom-4 sm:bottom-24 left-1/2 -translate-x-1/2'
              : currentStepData.position === 'left'
              ? 'top-1/2 left-4 sm:left-8 -translate-y-1/2'
              : 'top-1/2 right-4 sm:right-8 -translate-y-1/2'
          }`}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-blue-800 w-[calc(100vw-2rem)] sm:w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#1e5da8] to-blue-600 px-4 sm:px-6 py-4 sm:py-6 text-white">
              <button
                onClick={handleSkip}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Cerrar tour"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-start gap-3 sm:gap-4 pr-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <currentStepData.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 pt-0.5 sm:pt-1">
                  <h3 className="font-bold text-base sm:text-lg mb-1">
                    {currentStepData.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                    {currentStepData.description}
                  </p>
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 mt-3 sm:mt-4">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep
                        ? 'w-8 bg-white'
                        : idx < currentStep
                        ? 'w-1.5 bg-white/80'
                        : 'w-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-800">
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {currentStep + 1}/{steps.length}
              </div>
              
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <Button
                    onClick={handlePrevious}
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-8 sm:h-9"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                )}
                
                {isLastStep ? (
                  <Button
                    onClick={handleNext}
                    size="sm"
                    className="bg-[#1e5da8] hover:bg-blue-700 text-white gap-2 h-8 sm:h-9"
                  >
                    <Check className="w-4 h-4" />
                    ¡Listo!
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    size="sm"
                    className="bg-[#1e5da8] hover:bg-blue-700 text-white gap-2 h-8 sm:h-9"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating hint */}
        {currentStepData.position !== 'center' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute top-4 right-4 bg-white dark:bg-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-600 dark:text-gray-400 pointer-events-auto hidden sm:block"
          >
            Presiona Esc para saltar
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}