import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | '4k';

export interface UseResponsiveReturn {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  is4K: boolean;
  isTouchDevice: boolean;
  width: number;
  height: number;
}

export function useResponsive(): UseResponsiveReturn {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const breakpoint: Breakpoint =
    dimensions.width < 640 ? 'mobile' :
    dimensions.width < 1024 ? 'tablet' :
    dimensions.width < 2560 ? 'desktop' :
    '4k';

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    is4K: breakpoint === '4k',
    isTouchDevice: breakpoint === 'mobile' || breakpoint === 'tablet',
    width: dimensions.width,
    height: dimensions.height,
  };
}

export function useBreakpoint(): Breakpoint {
  return useResponsive().breakpoint;
}
