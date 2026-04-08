export { useResponsive, useIsMobile, useOrientation } from '../components/hooks/useResponsive';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | '4k';

export function useBreakpoint(): Breakpoint {
  const { width } = useResponsive();

  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 2560) return 'desktop';
  return '4k';
}
