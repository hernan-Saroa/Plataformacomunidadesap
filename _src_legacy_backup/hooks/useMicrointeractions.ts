/**
 * Hook: useMicrointeractions
 * Gestiona microinteracciones y animaciones para feedback visual premium
 */

import { useState, useCallback } from 'react';
import { microinteractionVariants, feedbackAnimations, getReducedMotion, FeedbackType } from '../utils/microinteractions';

export const useMicrointeractions = () => {
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const reducedMotion = getReducedMotion();

  /**
   * Trigger animación de feedback
   */
  const triggerFeedback = useCallback((type: FeedbackType, duration: number = 500) => {
    if (reducedMotion) return;

    setActiveAnimation(type);
    setTimeout(() => {
      setActiveAnimation(null);
    }, duration);
  }, [reducedMotion]);

  /**
   * Obtener variantes de animación según estado
   */
  const getVariants = useCallback((variant: keyof typeof microinteractionVariants) => {
    if (reducedMotion) {
      return {
        initial: {},
        animate: {},
        exit: {},
      };
    }
    return microinteractionVariants[variant];
  }, [reducedMotion]);

  /**
   * Props para elementos interactivos con hover/tap
   */
  const getInteractiveProps = useCallback(() => {
    if (reducedMotion) {
      return {};
    }

    return {
      whileHover: microinteractionVariants.hover,
      whileTap: microinteractionVariants.tap,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    };
  }, [reducedMotion]);

  /**
   * Props para elementos con focus
   */
  const getFocusProps = useCallback(() => {
    return {
      whileFocus: microinteractionVariants.focus,
    };
  }, []);

  /**
   * Animación de entrada según tipo
   */
  const getEntranceAnimation = useCallback((type: 'slideUp' | 'fadeIn' | 'scaleIn' = 'fadeIn') => {
    if (reducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }

    const variant = microinteractionVariants[type];
    return {
      initial: variant.initial,
      animate: variant.animate,
      exit: variant.exit,
      transition: variant.transition,
    };
  }, [reducedMotion]);

  /**
   * Animación actual según feedback
   */
  const getCurrentAnimation = useCallback(() => {
    if (!activeAnimation || reducedMotion) return undefined;
    return feedbackAnimations[activeAnimation as FeedbackType];
  }, [activeAnimation, reducedMotion]);

  return {
    triggerFeedback,
    getVariants,
    getInteractiveProps,
    getFocusProps,
    getEntranceAnimation,
    getCurrentAnimation,
    activeAnimation,
    reducedMotion,
  };
};
