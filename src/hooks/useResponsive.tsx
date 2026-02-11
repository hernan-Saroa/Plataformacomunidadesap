import { useState, useEffect, useMemo } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 * RESPONSIVE HOOKS LIBRARY - MOBILE FIRST
 * ═══════════════════════════════════════════════════════════════
 * 
 * Hooks centralizados para lógica responsive reutilizable.
 * Optimizado para performance (single listener, memoization).
 * 
 * Hooks disponibles:
 * - useBreakpoint() - Detectar breakpoint actual
 * - useResponsive() - Valores adaptativos
 * - useMediaQuery() - Media query custom
 * - useTouchDevice() - Detectar touch capability
 * - useViewportSize() - Tamaño del viewport
 */

// ════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ════════════════════════════════════════════════════════════════

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export const BREAKPOINTS = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px
  desktop: 1024,  // 1024-1365px
  wide: 1366,     // 1366px+
} as const;

export interface ResponsiveValue<T> {
  mobile: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
}

// ════════════════════════════════════════════════════════════════
// HOOK: useBreakpoint
// ════════════════════════════════════════════════════════════════

/**
 * Hook para detectar el breakpoint actual del viewport.
 * 
 * @returns Breakpoint actual ('mobile' | 'tablet' | 'desktop' | 'wide')
 * 
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 * 
 * if (breakpoint === 'mobile') {
 *   return <MobileView />;
 * }
 * ```
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const newBreakpoint = getBreakpoint(window.innerWidth);
      setBreakpoint(prev => prev === newBreakpoint ? prev : newBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

// ════════════════════════════════════════════════════════════════
// HOOK: useResponsive
// ════════════════════════════════════════════════════════════════

/**
 * Hook para obtener valores adaptativos según el breakpoint.
 * Soporta cascada: mobile → tablet → desktop → wide.
 * 
 * @param values - Valores para cada breakpoint
 * @returns Valor correspondiente al breakpoint actual
 * 
 * @example
 * ```tsx
 * const columns = useResponsive({
 *   mobile: 1,
 *   tablet: 2,
 *   desktop: 4,
 *   wide: 6
 * });
 * 
 * const padding = useResponsive({
 *   mobile: '12px',
 *   desktop: '24px'  // tablet hereda mobile, wide hereda desktop
 * });
 * ```
 */
export function useResponsive<T>(values: ResponsiveValue<T>): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return values.mobile;
      
      case 'tablet':
        return values.tablet ?? values.mobile;
      
      case 'desktop':
        return values.desktop ?? values.tablet ?? values.mobile;
      
      case 'wide':
        return values.wide ?? values.desktop ?? values.tablet ?? values.mobile;
      
      default:
        return values.mobile;
    }
  }, [breakpoint, values]);
}

// ════════════════════════════════════════════════════════════════
// HOOK: useMediaQuery
// ════════════════════════════════════════════════════════════════

/**
 * Hook para media queries custom.
 * 
 * @param query - Media query string
 * @returns true si la query matchea
 * 
 * @example
 * ```tsx
 * const isPortrait = useMediaQuery('(orientation: portrait)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isLargeScreen = useMediaQuery('(min-width: 1920px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Fallback for older browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

// ════════════════════════════════════════════════════════════════
// HOOK: useTouchDevice
// ════════════════════════════════════════════════════════════════

/**
 * Hook para detectar si el dispositivo tiene capacidad touch.
 * 
 * @returns true si el dispositivo soporta touch
 * 
 * @example
 * ```tsx
 * const isTouch = useTouchDevice();
 * 
 * return (
 *   <button className={isTouch ? 'touch-optimized' : 'mouse-optimized'}>
 *     Click me
 *   </button>
 * );
 * ```
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - Legacy browsers
      navigator.msMaxTouchPoints > 0
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar primer touch event
    const handleTouch = () => {
      setIsTouch(true);
      window.removeEventListener('touchstart', handleTouch);
    };

    window.addEventListener('touchstart', handleTouch, { once: true });
    return () => window.removeEventListener('touchstart', handleTouch);
  }, []);

  return isTouch;
}

// ════════════════════════════════════════════════════════════════
// HOOK: useViewportSize
// ════════════════════════════════════════════════════════════════

/**
 * Hook para obtener el tamaño actual del viewport.
 * 
 * @returns { width, height } del viewport
 * 
 * @example
 * ```tsx
 * const { width, height } = useViewportSize();
 * 
 * if (width < 768) {
 *   return <MobileLayout />;
 * }
 * ```
 */
export function useViewportSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1366, height: 768 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// ════════════════════════════════════════════════════════════════
// HOOK: useIsMobile (legacy compatibility)
// ════════════════════════════════════════════════════════════════

/**
 * Hook legacy para compatibilidad con código existente.
 * 
 * @deprecated Usar useBreakpoint() o useMediaQuery() en su lugar
 * 
 * @param breakpoint - Ancho máximo en px (default: 768)
 * @returns true si el viewport es menor al breakpoint
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

// ════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════

/**
 * Crear valores responsive con cascada automática.
 * 
 * @example
 * ```tsx
 * const spacing = createResponsiveValue({
 *   mobile: 12,
 *   desktop: 24
 * });
 * // Result: { mobile: 12, tablet: 12, desktop: 24, wide: 24 }
 * ```
 */
export function createResponsiveValue<T>(
  values: Partial<ResponsiveValue<T>> & { mobile: T }
): ResponsiveValue<T> {
  return {
    mobile: values.mobile,
    tablet: values.tablet ?? values.mobile,
    desktop: values.desktop ?? values.tablet ?? values.mobile,
    wide: values.wide ?? values.desktop ?? values.tablet ?? values.mobile,
  };
}

/**
 * Generar className responsive basado en breakpoint.
 * 
 * @example
 * ```tsx
 * const className = getResponsiveClassName({
 *   mobile: 'grid-cols-1',
 *   tablet: 'grid-cols-2',
 *   desktop: 'grid-cols-4'
 * });
 * ```
 */
export function useResponsiveClassName(
  classes: Partial<ResponsiveValue<string>>
): string {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    const classMap: Record<Breakpoint, string | undefined> = {
      mobile: classes.mobile,
      tablet: classes.tablet ?? classes.mobile,
      desktop: classes.desktop ?? classes.tablet ?? classes.mobile,
      wide: classes.wide ?? classes.desktop ?? classes.tablet ?? classes.mobile,
    };

    return classMap[breakpoint] || '';
  }, [breakpoint, classes]);
}

// ════════════════════════════════════════════════════════════════
// REACT SERVER COMPONENTS COMPATIBILITY
// ════════════════════════════════════════════════════════════════

/**
 * Hook seguro para SSR/RSC.
 * No ejecuta lógica en servidor, retorna valores por defecto.
 */
export function useBreakpointSSR(defaultBreakpoint: Breakpoint = 'desktop'): Breakpoint {
  if (typeof window === 'undefined') return defaultBreakpoint;
  return useBreakpoint();
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export default {
  useBreakpoint,
  useResponsive,
  useMediaQuery,
  useTouchDevice,
  useViewportSize,
  useIsMobile,
  createResponsiveValue,
  useResponsiveClassName,
  useBreakpointSSR,
  BREAKPOINTS,
};
