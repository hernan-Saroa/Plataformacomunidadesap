/**
 * GuidedTour - Sistema de Tour Guiado Interactivo
 * Onboarding premium tipo Google Workspace / Salesforce
 * 
 * Features:
 * ✅ Spotlight dinámico en elemento activo
 * ✅ Backdrop oscuro con overlay
 * ✅ Tooltips con flechas direccionales
 * ✅ Navegación paso a paso
 * ✅ Progreso visual
 * ✅ Auto-scroll al elemento
 * ✅ Animaciones suaves
 * ✅ Persistencia (localStorage)
 * ✅ Responsive
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronRight, ChevronLeft, SkipForward, 
  Lightbulb, CheckCircle, Info, Sparkles,
  Play, ArrowRight, Target
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { useTour } from './TourContext';

export interface TourStep {
  id: string;
  target: string; // Selector CSS del elemento a destacar
  title: string;
  description: string;
  content?: string; // Contenido adicional opcional
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'premium';
  showSkip?: boolean;
  actionLabel?: string;
  action?: () => void;
  // ✅ NUEVO: Navegación entre módulos
  navigateTo?: string; // ID del módulo a navegar antes de mostrar este paso
  navigationDelay?: number; // Delay en ms después de navegar (default: 500ms)
}

interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  tourId: string; // ID único para persistencia
  onStepChange?: (step: number) => void; // ✅ NUEVO: Callback cuando cambia el paso
}

export function GuidedTour({ 
  steps, 
  isOpen, 
  onClose, 
  onComplete,
  tourId,
  onStepChange
}: GuidedTourProps) {
  const tourContext = useTour(); // ✅ Usar contexto global
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // ✅ Usar currentStep del contexto si el tour está activo en el contexto
  const currentStep = tourContext.isTourActive && tourContext.tourId === tourId 
    ? tourContext.currentStep 
    : 0;

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  // ✅ Sincronizar cuando se abre el tour
  useEffect(() => {
    if (isOpen && tourContext.tourId !== tourId) {
      tourContext.startTour(tourId, 0);
    }
  }, [isOpen, tourId]);

  // Calcular posición del elemento destacado
  useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Auto-scroll al elemento
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();

    // Re-calcular en resize
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, step, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextStep = currentStep + 1;
      tourContext.setStep(nextStep); // ✅ Actualizar en contexto global
      onStepChange?.(nextStep); // ✅ Notificar cambio de paso
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      const prevStep = currentStep - 1;
      tourContext.setStep(prevStep); // ✅ Actualizar en contexto global
      onStepChange?.(prevStep); // ✅ Notificar cambio de paso
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    tourContext.completeTour(); // ✅ Marcar como completado en contexto
    onComplete?.();
    onClose();
  };

  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const placement = step.placement || 'bottom';
    const padding = 20;
    const tooltipWidth = 384; // w-96 = 24rem = 384px
    const tooltipHeight = 400; // altura estimada
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let position = { top: '0px', left: '0px', transform: 'translate(0, 0)' };

    switch (placement) {
      case 'top':
        position = {
          top: `${targetRect.top + scrollY - padding}px`,
          left: `${targetRect.left + scrollX + targetRect.width / 2}px`,
          transform: 'translate(-50%, -100%)',
        };
        break;
      case 'bottom':
        position = {
          top: `${targetRect.bottom + scrollY + padding}px`,
          left: `${targetRect.left + scrollX + targetRect.width / 2}px`,
          transform: 'translate(-50%, 0)',
        };
        break;
      case 'left':
        position = {
          top: `${targetRect.top + scrollY + targetRect.height / 2}px`,
          left: `${targetRect.left + scrollX - padding}px`,
          transform: 'translate(-100%, -50%)',
        };
        break;
      case 'right':
        position = {
          top: `${targetRect.top + scrollY + targetRect.height / 2}px`,
          left: `${targetRect.right + scrollX + padding}px`,
          transform: 'translate(0, -50%)',
        };
        break;
      case 'center':
        position = {
          top: `${scrollY + viewportHeight / 2}px`,
          left: `${scrollX + viewportWidth / 2}px`,
          transform: 'translate(-50%, -50%)',
        };
        break;
      default:
        position = {
          top: `${targetRect.bottom + scrollY + padding}px`,
          left: `${targetRect.left + scrollX + targetRect.width / 2}px`,
          transform: 'translate(-50%, 0)',
        };
    }

    // AJUSTE INTELIGENTE: Asegurar que siempre esté visible en la pantalla
    const calculateActualPosition = () => {
      // Calcular la posición absoluta del tooltip
      let actualTop = parseInt(position.top);
      let actualLeft = parseInt(position.left);

      // Aplicar transformaciones
      if (position.transform.includes('-50%')) {
        if (position.transform.includes('translateX(-50%)') || position.transform.includes('translate(-50%')) {
          actualLeft -= tooltipWidth / 2;
        }
        if (position.transform.includes('translateY(-50%)') || position.transform.includes('translate(-50%, -50%)')) {
          actualTop -= tooltipHeight / 2;
        }
      }

      // Ajustar si se sale por la derecha
      if (actualLeft + tooltipWidth > scrollX + viewportWidth - 20) {
        actualLeft = scrollX + viewportWidth - tooltipWidth - 20;
      }

      // Ajustar si se sale por la izquierda
      if (actualLeft < scrollX + 20) {
        actualLeft = scrollX + 20;
      }

      // Ajustar si se sale por abajo
      if (actualTop + tooltipHeight > scrollY + viewportHeight - 20) {
        actualTop = scrollY + viewportHeight - tooltipHeight - 20;
      }

      // Ajustar si se sale por arriba
      if (actualTop < scrollY + 20) {
        actualTop = scrollY + 20;
      }

      return {
        top: `${actualTop}px`,
        left: `${actualLeft}px`,
        transform: 'translate(0, 0)',
      };
    };

    return calculateActualPosition();
  };

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <Info className="w-5 h-5 text-amber-600" />;
      case 'premium':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColorForType = (type?: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'premium':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Backdrop con Spotlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          {/* SVG para crear el efecto de spotlight */}
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - 4}
                    y={targetRect.top - 4}
                    width={targetRect.width + 8}
                    height={targetRect.height + 8}
                    rx="8"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Borde brillante alrededor del elemento destacado */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-lg"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                border: '3px solid #3B82F6',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.4)',
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>

        {/* Tooltip de contenido */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute z-[10000]"
          style={{
            ...getTooltipPosition(),
            pointerEvents: 'auto',
          }}
        >
          <Card 
            className={`w-80 md:w-96 shadow-2xl border-2 ${getColorForType(step.type)}`}
          >
            {/* Header */}
            <div className="p-4 pb-3 border-b flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {step.icon || getIconForType(step.type)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 mb-1 text-sm md:text-base">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {step.content && (
              <div className="p-4 border-b bg-white">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {step.content}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600">
                  Paso {currentStep + 1} de {steps.length}
                </p>
                <p className="text-xs font-bold text-blue-600">
                  {progress}%
                </p>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-2 flex items-center justify-between gap-2 bg-gray-50">
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <Button
                    onClick={handlePrevious}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" />
                    Anterior
                  </Button>
                )}

                {step.showSkip !== false && !isLastStep && (
                  <Button
                    onClick={handleSkip}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-gray-500"
                  >
                    <SkipForward className="w-3 h-3 mr-1" />
                    Saltar Tour
                  </Button>
                )}
              </div>

              <Button
                onClick={handleNext}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    ¡Finalizar!
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Arrow pointing to element */}
          {targetRect && step.placement !== 'center' && (
            <div
              className="absolute w-0 h-0"
              style={{
                ...(step.placement === 'bottom' && {
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid #DBEAFE',
                }),
                ...(step.placement === 'top' && {
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid #DBEAFE',
                }),
                ...(step.placement === 'right' && {
                  left: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderRight: '8px solid #DBEAFE',
                }),
                ...(step.placement === 'left' && {
                  right: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '8px solid #DBEAFE',
                }),
              }}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Botón para activar el tour guiado
 */
interface TourButtonProps {
  onClick: () => void;
  variant?: 'default' | 'floating' | 'inline';
  label?: string;
}

export function TourButton({ onClick, variant = 'default', label = 'Tour Guiado' }: TourButtonProps) {
  if (variant === 'floating') {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className="fixed bottom-24 right-5 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold hover:shadow-blue-500/50 transition-all hover:from-blue-700 hover:to-purple-700"
        title="Iniciar Tour Guiado"
      >
        <Play className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">Tour</span>
      </motion.button>
    );
  }

  if (variant === 'inline') {
    return (
      <Button
        onClick={onClick}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
      >
        <Target className="w-4 h-4 mr-2" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold"
    >
      <Play className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}

/**
 * Hook para verificar si el usuario ya vio el tour
 */
export function useTourCompleted(tourId: string) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(`tour_completed_${tourId}`) === 'true';
    setCompleted(hasCompleted);
  }, [tourId]);

  const resetTour = () => {
    localStorage.removeItem(`tour_completed_${tourId}`);
    setCompleted(false);
  };

  return { completed, resetTour };
}