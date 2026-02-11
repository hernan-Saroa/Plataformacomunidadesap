/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useResponsive - Sistema Responsive World-Class
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook centralizado para manejo de breakpoints y responsive design
 * Compatible con el sistema de diseño ESAP optimizado para 4K
 * 
 * @example
 * const { isMobile, isTablet, isDesktop, is4K, breakpoint } = useResponsive();
 * 
 * if (isMobile) {
 *   return <MobileView />;
 * }
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// BREAKPOINTS OFICIALES ESAP
// ════════════════════════════════════════════════════════════════════════════

export const BREAKPOINTS = {
  xs: 320,    // iPhone SE, móviles pequeños
  sm: 640,    // Móviles grandes
  md: 768,    // Tablets verticales
  lg: 1024,   // Tablets horizontales / Laptops pequeñas
  xl: 1280,   // Desktops estándar
  '2xl': 1536, // Desktops grandes
  '3xl': 1920, // Full HD
  '4xl': 2560, // 2K
  '5xl': 3840  // 4K - Optimizado ESAP
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export interface ResponsiveState {
  // Breakpoints individuales
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2Xl: boolean;
  is3Xl: boolean;
  is4Xl: boolean;
  is5Xl: boolean;
  
  // Categorías de dispositivo
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1024px
  isDesktop: boolean;     // >= 1024px
  is4K: boolean;          // >= 3840px
  
  // Breakpoint actual
  breakpoint: Breakpoint;
  
  // Dimensiones
  width: number;
  height: number;
  
  // Orientación
  isPortrait: boolean;
  isLandscape: boolean;
  
  // Touch device
  isTouch: boolean;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => 
    getResponsiveState(typeof window !== 'undefined' ? window.innerWidth : 1920)
  );

  useEffect(() => {
    // No ejecutar en SSR
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setState(getResponsiveState(window.innerWidth));
    };

    // Agregar listener
    window.addEventListener('resize', handleResize);
    
    // Listener de orientación
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

function getResponsiveState(width: number): ResponsiveState {
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
  
  // Detectar touch device
  const isTouch = typeof window !== 'undefined' 
    ? ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    : false;

  // Determinar breakpoint actual
  let breakpoint: Breakpoint = 'xs';
  if (width >= BREAKPOINTS['5xl']) breakpoint = '5xl';
  else if (width >= BREAKPOINTS['4xl']) breakpoint = '4xl';
  else if (width >= BREAKPOINTS['3xl']) breakpoint = '3xl';
  else if (width >= BREAKPOINTS['2xl']) breakpoint = '2xl';
  else if (width >= BREAKPOINTS.xl) breakpoint = 'xl';
  else if (width >= BREAKPOINTS.lg) breakpoint = 'lg';
  else if (width >= BREAKPOINTS.md) breakpoint = 'md';
  else if (width >= BREAKPOINTS.sm) breakpoint = 'sm';

  return {
    // Breakpoints individuales
    isXs: width >= BREAKPOINTS.xs && width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
    is2Xl: width >= BREAKPOINTS['2xl'] && width < BREAKPOINTS['3xl'],
    is3Xl: width >= BREAKPOINTS['3xl'] && width < BREAKPOINTS['4xl'],
    is4Xl: width >= BREAKPOINTS['4xl'] && width < BREAKPOINTS['5xl'],
    is5Xl: width >= BREAKPOINTS['5xl'],
    
    // Categorías
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    is4K: width >= BREAKPOINTS['5xl'],
    
    // Breakpoint actual
    breakpoint,
    
    // Dimensiones
    width,
    height,
    
    // Orientación
    isPortrait: height > width,
    isLandscape: width >= height,
    
    // Touch
    isTouch
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK: useMediaQuery
// ════════════════════════════════════════════════════════════════════════════

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    
    // Listener moderno
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK: useBreakpoint
// ════════════════════════════════════════════════════════════════════════════

export function useBreakpoint(): Breakpoint {
  const { breakpoint } = useResponsive();
  return breakpoint;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK: useResponsiveValue
// ════════════════════════════════════════════════════════════════════════════

type ResponsiveValueMap<T> = {
  base?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  '3xl'?: T;
  '4xl'?: T;
  '5xl'?: T;
};

export function useResponsiveValue<T>(values: ResponsiveValueMap<T>): T {
  const { breakpoint } = useResponsive();
  
  // Orden de prioridad de breakpoints
  const priorities: Breakpoint[] = ['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  
  // Encontrar el breakpoint actual en la lista
  const currentIndex = priorities.indexOf(breakpoint);
  
  // Buscar el valor más cercano
  for (let i = currentIndex; i < priorities.length; i++) {
    const bp = priorities[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  // Fallback al valor base o primer valor disponible
  return values.base ?? values[Object.keys(values)[0] as Breakpoint]!;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK: useViewportSize
// ════════════════════════════════════════════════════════════════════════════

export function useViewportSize() {
  const { width, height } = useResponsive();
  return { width, height };
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK: useTouchDevice
// ════════════════════════════════════════════════════════════════════════════

export function useTouchDevice(): boolean {
  const { isTouch } = useResponsive();
  return isTouch;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export default useResponsive;
