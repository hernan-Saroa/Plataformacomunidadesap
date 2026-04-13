/**
 * MicrointeractionWrapper Component
 * Wrapper para añadir microinteracciones premium a cualquier elemento
 */

import { motion, HTMLMotionProps } from 'motion/react';
import { useMicrointeractions } from '../../hooks/useMicrointeractions';
import { createRipple } from '../../utils/microinteractions';

interface MicrointeractionWrapperProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  type?: 'button' | 'card' | 'item' | 'none';
  enableHover?: boolean;
  enableTap?: boolean;
  enableFocus?: boolean;
  enableRipple?: boolean;
  entranceAnimation?: 'slideUp' | 'fadeIn' | 'scaleIn' | 'none';
  className?: string;
}

export function MicrointeractionWrapper({
  children,
  type = 'none',
  enableHover = true,
  enableTap = true,
  enableFocus = true,
  enableRipple = false,
  entranceAnimation = 'none',
  className = '',
  onClick,
  ...props
}: MicrointeractionWrapperProps) {
  const {
    getInteractiveProps,
    getFocusProps,
    getEntranceAnimation,
    reducedMotion,
  } = useMicrointeractions();

  // Configuración según tipo
  const getTypeConfig = () => {
    switch (type) {
      case 'button':
        return {
          enableHover: true,
          enableTap: true,
          enableFocus: true,
          enableRipple: true,
        };
      case 'card':
        return {
          enableHover: true,
          enableTap: false,
          enableFocus: true,
          enableRipple: false,
        };
      case 'item':
        return {
          enableHover: true,
          enableTap: true,
          enableFocus: false,
          enableRipple: false,
        };
      default:
        return {
          enableHover,
          enableTap,
          enableFocus,
          enableRipple,
        };
    }
  };

  const config = getTypeConfig();

  // Props de interacción
  const interactiveProps = config.enableHover || config.enableTap
    ? getInteractiveProps()
    : {};

  const focusProps = config.enableFocus ? getFocusProps() : {};

  // Props de animación de entrada
  const entranceProps = entranceAnimation !== 'none'
    ? getEntranceAnimation(entranceAnimation)
    : {};

  // Manejar click con ripple
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (config.enableRipple && !reducedMotion) {
      createRipple(e);
    }
    onClick?.(e);
  };

  return (
    <motion.div
      className={`relative ${className}`}
      {...interactiveProps}
      {...focusProps}
      {...entranceProps}
      onClick={handleClick}
      style={{
        overflow: enableRipple ? 'hidden' : undefined,
        ...props.style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Estilos CSS para ripple effect
 * Agregar al globals.css:
 * 
 * .ripple {
 *   position: absolute;
 *   border-radius: 50%;
 *   background-color: rgba(255, 255, 255, 0.6);
 *   transform: scale(0);
 *   animation: ripple-animation 600ms ease-out;
 *   pointer-events: none;
 * }
 * 
 * @keyframes ripple-animation {
 *   to {
 *     transform: scale(4);
 *     opacity: 0;
 *   }
 * }
 */
