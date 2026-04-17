import React from 'react';
import { motion } from 'motion/react';
import { ESAPLogoLoader } from './ESAPLogoLoader';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

/**
 * LoadingSpinner Component
 * 
 * Spinner optimizado para Suspense lazy loading
 * Utiliza el logo ESAP animado con efecto de llenado
 */
export function LoadingSpinner({ 
  size = 'md', 
  text = 'Cargando...', 
  fullScreen = false 
}: LoadingSpinnerProps) {
  
  const sizeMap = {
    sm: 36,
    md: 56,
    lg: 80,
    xl: 100,
  };

  return (
    <ESAPLogoLoader 
      size={sizeMap[size]} 
      text={text} 
      fullScreen={fullScreen} 
    />
  );
}

/**
 * Skeleton Loader for cards
 * Better UX than spinner for content loading
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}

/**
 * Loading Bar for page transitions
 */
export function LoadingBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
      <motion.div
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        className="h-full bg-gradient-to-r from-[#2962FF] to-[#003DA5]"
      />
    </div>
  );
}

/**
 * Page Loading Component
 * Para usar con Suspense en lazy loading
 */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <ESAPLogoLoader size={110} text="Cargando..." />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-xs text-gray-500"
        >
          Escuela Superior de Administración Pública
        </motion.div>
      </div>
    </div>
  );
}
