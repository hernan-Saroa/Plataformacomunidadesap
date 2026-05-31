import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | '4k';

export interface UseResponsiveReturn {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  is4K: boolean;
  isLarge: boolean;
  isTouchDevice: boolean;
  width: number;
  height: number;
  // Tailwind CSS standard breakpoints
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2Xl: boolean;
}

function getDimensions() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

export function useResponsive(): UseResponsiveReturn {
  const [dimensions, setDimensions] = useState(getDimensions);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
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
    isLarge: dimensions.width >= 1536,
    isTouchDevice: breakpoint === 'mobile' || breakpoint === 'tablet',
    width: dimensions.width,
    height: dimensions.height,
    isSm: dimensions.width >= 640,
    isMd: dimensions.width >= 768,
    isLg: dimensions.width >= 1024,
    isXl: dimensions.width >= 1280,
    is2Xl: dimensions.width >= 1536,
  };
}

export function useBreakpoint(): Breakpoint {
  return useResponsive().breakpoint;
}

