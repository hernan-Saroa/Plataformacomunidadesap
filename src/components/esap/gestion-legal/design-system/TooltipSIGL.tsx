/**
 * TOOLTIP SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Tooltip consistente para todo el sistema
 */

import { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import DESIGN_TOKENS from './tokens';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipSIGLProps {
  content: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  children: ReactNode;
  maxWidth?: number;
  className?: string;
}

export function TooltipSIGL({
  content,
  position = 'top',
  delay = 200,
  disabled = false,
  children,
  maxWidth = 200,
  className = '',
}: TooltipSIGLProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    const gap = 8; // Espacio entre trigger y tooltip

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;

      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;

      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;

      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Ajustar si se sale de la pantalla
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  // Variantes de animación según posición
  const getAnimationVariants = () => {
    const distance = 10;
    switch (position) {
      case 'top':
        return {
          initial: { opacity: 0, y: distance },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: distance },
        };
      case 'bottom':
        return {
          initial: { opacity: 0, y: -distance },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -distance },
        };
      case 'left':
        return {
          initial: { opacity: 0, x: distance },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: distance },
        };
      case 'right':
        return {
          initial: { opacity: 0, x: -distance },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -distance },
        };
    }
  };

  const variants = getAnimationVariants();

  // Arrow styles
  const getArrowStyles = (): CSSProperties => {
    const arrowSize = 6;
    const baseStyles: CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: `${DESIGN_TOKENS.colors.neutral.darkGray} transparent transparent transparent`,
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: `transparent transparent ${DESIGN_TOKENS.colors.neutral.darkGray} transparent`,
        };
      case 'left':
        return {
          ...baseStyles,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: `transparent transparent transparent ${DESIGN_TOKENS.colors.neutral.darkGray}`,
        };
      case 'right':
        return {
          ...baseStyles,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: `transparent ${DESIGN_TOKENS.colors.neutral.darkGray} transparent transparent`,
        };
    }
  };

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-block ${className}`}
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                ref={tooltipRef}
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="fixed z-[9999] pointer-events-none"
                style={{
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                }}
              >
                <div
                  className="relative"
                  style={{
                    maxWidth: `${maxWidth}px`,
                    padding: '8px 12px',
                    background: DESIGN_TOKENS.colors.neutral.darkGray,
                    color: DESIGN_TOKENS.colors.primary.white,
                    fontSize: DESIGN_TOKENS.typography.fontSize.small,
                    lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
                    borderRadius: DESIGN_TOKENS.borderRadius.small,
                    boxShadow: DESIGN_TOKENS.shadows.level2,
                    wordWrap: 'break-word',
                  }}
                >
                  {content}
                  {/* Arrow */}
                  <div style={getArrowStyles()} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

// ========================================
// SIMPLE TOOLTIP (sin arrow, más rápido)
// ========================================

export interface SimpleTooltipProps {
  text: string;
  children: ReactNode;
  delay?: number;
}

export function SimpleTooltip({ text, children, delay = 200 }: SimpleTooltipProps) {
  return (
    <TooltipSIGL content={text} position="top" delay={delay}>
      {children}
    </TooltipSIGL>
  );
}
