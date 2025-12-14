/**
 * Responsive Hooks
 * Utilidades para detectar tamaño de pantalla, dispositivo y orientación
 */

import { useState, useEffect } from 'react';

// Breakpoints matching Tailwind defaults
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Hook para detectar breakpoint actual
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoint();
 */
export function useBreakpoint() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    // Specific breakpoints
    isMobile: windowSize.width < breakpoints.md,
    isTablet: windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg,
    isDesktop: windowSize.width >= breakpoints.lg,
    
    // Detailed breakpoints
    isSmallMobile: windowSize.width < breakpoints.sm,
    isMediumDevice: windowSize.width >= breakpoints.sm && windowSize.width < breakpoints.md,
    isLargeTablet: windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg,
    isSmallDesktop: windowSize.width >= breakpoints.lg && windowSize.width < breakpoints.xl,
    isLargeDesktop: windowSize.width >= breakpoints.xl,
    is4K: windowSize.width >= breakpoints['2xl'],
    
    // Exact values
    width: windowSize.width,
    height: windowSize.height,
  };
}

/**
 * Hook para media query personalizada
 * @example
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [matches, query]);

  return matches;
}

/**
 * Hook para detectar orientación del dispositivo
 * @example
 * const { isPortrait, isLandscape } = useOrientation();
 */
export function useOrientation() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  return {
    isPortrait,
    isLandscape,
    orientation: isPortrait ? 'portrait' : 'landscape',
  };
}

/**
 * Hook para detectar tipo de dispositivo
 * @example
 * const { isMobileDevice, isTabletDevice, isTouchDevice } = useDeviceDetect();
 */
export function useDeviceDetect() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobileDevice: false,
    isTabletDevice: false,
    isDesktopDevice: false,
    isTouchDevice: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isEdge: false,
    isFirefox: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;

    setDeviceInfo({
      // Device type
      isMobileDevice: /iPhone|iPod|Android.*Mobile/i.test(ua),
      isTabletDevice: /iPad|Android(?!.*Mobile)/i.test(ua),
      isDesktopDevice: !/iPhone|iPod|iPad|Android/i.test(ua),
      
      // Touch capability
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      
      // Operating system
      isIOS: /iPhone|iPad|iPod/i.test(ua),
      isAndroid: /Android/i.test(ua),
      
      // Browser
      isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
      isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
      isEdge: /Edg/i.test(ua),
      isFirefox: /Firefox/i.test(ua),
    });
  }, []);

  return deviceInfo;
}

/**
 * Hook para detectar viewport height (útil para mobile con/sin barra de navegación)
 * @example
 * const { vh, fullHeight } = useViewportHeight();
 */
export function useViewportHeight() {
  const [vh, setVh] = useState(
    typeof window !== 'undefined' ? window.innerHeight * 0.01 : 0
  );

  useEffect(() => {
    function handleResize() {
      const newVh = window.innerHeight * 0.01;
      setVh(newVh);
      document.documentElement.style.setProperty('--vh', `${newVh}px`);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    vh,
    fullHeight: `${vh * 100}px`, // Use this for full viewport height
  };
}

/**
 * Hook para detectar scroll direction
 * @example
 * const { scrollDirection, isScrollingDown } = useScrollDirection();
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      if (Math.abs(scrollY - lastScrollY) < 5) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      setLastScrollY(scrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScrollY]);

  return {
    scrollDirection,
    isScrollingDown: scrollDirection === 'down',
    isScrollingUp: scrollDirection === 'up',
  };
}

/**
 * Hook para detectar si estamos en modo standalone (PWA)
 * @example
 * const isStandalone = useStandalone();
 */
export function useStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isPWA);
  }, []);

  return isStandalone;
}

/**
 * Hook combinado para toda la info responsive
 * @example
 * const responsive = useResponsive();
 */
export function useResponsive() {
  const breakpoint = useBreakpoint();
  const orientation = useOrientation();
  const device = useDeviceDetect();
  const viewport = useViewportHeight();
  const scroll = useScrollDirection();
  const isStandalone = useStandalone();

  return {
    ...breakpoint,
    ...orientation,
    ...device,
    ...viewport,
    ...scroll,
    isStandalone,
  };
}
