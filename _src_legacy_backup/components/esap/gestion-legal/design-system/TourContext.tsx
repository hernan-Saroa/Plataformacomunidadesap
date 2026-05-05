/**
 * TourContext - Contexto global para el Tour Guiado
 * Mantiene el estado del tour persistente entre navegación de módulos
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TourContextState {
  // Estado del tour
  isTourActive: boolean;
  currentStep: number;
  tourId: string | null;
  
  // Acciones
  startTour: (tourId: string, startStep?: number) => void;
  stopTour: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeTour: () => void;
  
  // Utilidades
  isTourCompleted: (tourId: string) => boolean;
  resetTourCompletion: (tourId: string) => void;
}

const TourContext = createContext<TourContextState | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourId, setTourId] = useState<string | null>(null);

  const startTour = (newTourId: string, startStep: number = 0) => {
    console.log(`🎯 Iniciando tour: ${newTourId} en paso ${startStep}`);
    setTourId(newTourId);
    setCurrentStep(startStep);
    setIsTourActive(true);
    
    // Guardar estado en sessionStorage para persistencia durante la sesión
    sessionStorage.setItem('tour_active', 'true');
    sessionStorage.setItem('tour_id', newTourId);
    sessionStorage.setItem('tour_step', startStep.toString());
  };

  const stopTour = () => {
    console.log('🛑 Deteniendo tour');
    setIsTourActive(false);
    setTourId(null);
    setCurrentStep(0);
    
    // Limpiar sessionStorage
    sessionStorage.removeItem('tour_active');
    sessionStorage.removeItem('tour_id');
    sessionStorage.removeItem('tour_step');
  };

  const setStep = (step: number) => {
    console.log(`📍 Cambiando a paso ${step}`);
    setCurrentStep(step);
    
    // Actualizar sessionStorage
    if (isTourActive) {
      sessionStorage.setItem('tour_step', step.toString());
    }
  };

  const nextStep = () => {
    const newStep = currentStep + 1;
    setStep(newStep);
  };

  const previousStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setStep(newStep);
    }
  };

  const completeTour = () => {
    console.log(`✅ Tour completado: ${tourId}`);
    if (tourId) {
      localStorage.setItem(`tour_completed_${tourId}`, 'true');
    }
    stopTour();
  };

  const isTourCompleted = (checkTourId: string): boolean => {
    return localStorage.getItem(`tour_completed_${checkTourId}`) === 'true';
  };

  const resetTourCompletion = (resetTourId: string) => {
    localStorage.removeItem(`tour_completed_${resetTourId}`);
  };

  // Restaurar estado del tour al montar el componente (persistencia durante la sesión)
  useEffect(() => {
    const savedTourActive = sessionStorage.getItem('tour_active') === 'true';
    const savedTourId = sessionStorage.getItem('tour_id');
    const savedTourStep = sessionStorage.getItem('tour_step');

    if (savedTourActive && savedTourId && savedTourStep) {
      console.log(`🔄 Restaurando tour: ${savedTourId} en paso ${savedTourStep}`);
      setTourId(savedTourId);
      setCurrentStep(parseInt(savedTourStep, 10));
      setIsTourActive(true);
    }
  }, []);

  const value: TourContextState = {
    isTourActive,
    currentStep,
    tourId,
    startTour,
    stopTour,
    setStep,
    nextStep,
    previousStep,
    completeTour,
    isTourCompleted,
    resetTourCompletion,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/**
 * Hook para usar el contexto del tour
 */
export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour debe usarse dentro de TourProvider');
  }
  return context;
}
