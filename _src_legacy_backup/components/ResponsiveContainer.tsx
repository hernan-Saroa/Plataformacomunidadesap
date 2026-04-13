/**
 * ResponsiveContainer - Componente para renderizar diferentes layouts según dispositivo
 * ✅ Mobile-first approach
 * ✅ Type-safe con TypeScript
 * ✅ Optimizado para performance
 */

import { ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface ResponsiveContainerProps {
  mobile: ReactNode;
  desktop: ReactNode;
  breakpoint?: number;
  className?: string;
}

export function ResponsiveContainer({ 
  mobile, 
  desktop, 
  breakpoint = 768,
  className = ''
}: ResponsiveContainerProps) {
  const isMobile = useIsMobile(breakpoint);
  
  return (
    <div className={className}>
      {isMobile ? mobile : desktop}
    </div>
  );
}

// Versión con tablet support
interface ResponsiveContainerExtendedProps {
  mobile: ReactNode;
  tablet?: ReactNode;
  desktop: ReactNode;
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  className?: string;
}

export function ResponsiveContainerExtended({ 
  mobile, 
  tablet, 
  desktop,
  mobileBreakpoint = 640,
  tabletBreakpoint = 1024,
  className = ''
}: ResponsiveContainerExtendedProps) {
  const isSmallMobile = useIsMobile(mobileBreakpoint);
  const isMobileOrTablet = useIsMobile(tabletBreakpoint);
  
  let content: ReactNode;
  
  if (isSmallMobile) {
    content = mobile;
  } else if (isMobileOrTablet && tablet) {
    content = tablet;
  } else {
    content = desktop;
  }
  
  return (
    <div className={className}>
      {content}
    </div>
  );
}

// Hook alternativo para usar en lógica condicional
export function useResponsiveRender<T>({
  mobile,
  tablet,
  desktop,
}: {
  mobile: T;
  tablet?: T;
  desktop: T;
}): T {
  const isSmallMobile = useIsMobile(640);
  const isTablet = useIsMobile(1024);
  
  if (isSmallMobile) return mobile;
  if (isTablet && tablet) return tablet;
  return desktop;
}

// Ejemplo de uso:
/*
// Opción 1: Componente
<ResponsiveContainer
  mobile={<MobileLayout />}
  desktop={<DesktopLayout />}
/>

// Opción 2: Hook para valores
const columns = useResponsiveRender({
  mobile: 1,
  tablet: 2,
  desktop: 4
});

// Opción 3: Extended con tablet
<ResponsiveContainerExtended
  mobile={<MobileNav />}
  tablet={<TabletNav />}
  desktop={<DesktopNav />}
/>
*/
