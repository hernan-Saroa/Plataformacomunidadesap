/**
 * Microinteracciones Premium - Utilities
 * Sistema de animaciones y feedback visual para UX world-class
 */

export const microinteractionVariants = {
  // Hover suave con lift
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },

  // Click con feedback inmediato
  tap: {
    scale: 0.98,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 30,
    },
  },

  // Focus visible para accesibilidad
  focus: {
    boxShadow: "0 0 0 3px rgba(30, 93, 168, 0.3)",
    transition: {
      duration: 0.2,
    },
  },

  // Entrada desde abajo
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },

  // Fade in suave
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },

  // Scale in desde centro
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },

  // Shake para errores
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },

  // Success bounce
  successBounce: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },

  // Pulse para loading
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // Shimmer para skeleton loading
  shimmer: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },

  // Entrada desde la izquierda
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },

  // Entrada desde la derecha
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

// Tipos de feedback
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export const feedbackAnimations: Record<FeedbackType, any> = {
  success: {
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: { duration: 0.5 },
  },
  error: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 },
  },
  warning: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3, repeat: 2 },
  },
  info: {
    opacity: [0, 1],
    y: [20, 0],
    transition: { duration: 0.3 },
  },
  loading: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" },
  },
};

// Configuración de reducción de movimiento
export const getReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getResponsiveAnimation = (animation: any) => {
  if (getReducedMotion()) {
    // Simplificar animaciones si el usuario prefiere movimiento reducido
    return {
      ...animation,
      transition: { duration: 0.01 },
    };
  }
  return animation;
};

// Ripple effect (para clicks)
export const createRipple = (event: React.MouseEvent<HTMLElement>) => {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  ripple.style.width = ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - radius}px`;
  ripple.style.top = `${event.clientY - rect.top - radius}px`;
  ripple.classList.add('ripple');

  const existingRipple = button.getElementsByClassName('ripple')[0];
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
};
