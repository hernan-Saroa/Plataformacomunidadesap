/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USE RESPONSIVE HOOK - DETECCIÓN DE BREAKPOINT Y DISPOSITIVO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para detectar el breakpoint actual y tipo de dispositivo en tiempo real.
 * Se actualiza automáticamente cuando cambia el tamaño de la ventana.
 * 
 * BREAKPOINTS:
 * - mobile:  < 640px  (sm en Tailwind)
 * - tablet:  640px - 1024px (sm a lg)
 * - desktop: 1024px - 2560px (lg a 4k)
 * - 4k:      ≥ 2560px
 * 
 * HELPERS:
 * - isMobile: true si < 640px
 * - isTablet: true si 640-1024px
 * - isDesktop: true si 1024-2560px
 * - is4K: true si ≥ 2560px
 * - isTouchDevice: true si mobile o tablet
 * 
 * USO:
 * ```tsx
 * const { isMobile, breakpoint } = useResponsive();
 * 
 * return (
 *   <input
 *     placeholder={isMobile ? "Buscar..." : "Buscar por código..."}
 *   />
 * );
 * ```
 * 
 * CREADO: 30 Enero 2026 - FASE 1 DÍA 1
 * REF: PLAN_IMPLEMENTACION_OPCION_B.md - Tarea 1.2
 */

import { useState, useEffect } from 'react';

/** Tipos de breakpoint disponibles */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | '4k';

/** Valores retornados por el hook */
export interface UseResponsiveReturn {
  /** Breakpoint actual: 'mobile' | 'tablet' | 'desktop' | '4k' */
  breakpoint: Breakpoint;
  
  /** true si ancho < 640px */
  isMobile: boolean;
  
  /** true si ancho entre 640px y 1024px */
  isTablet: boolean;
  
  /** true si ancho entre 1024px y 2560px */
  isDesktop: boolean;
  
  /** true si ancho ≥ 2560px */
  is4K: boolean;
  
  /** true si mobile o tablet (dispositivos táctiles típicamente) */
  isTouchDevice: boolean;
}

/**
 * Hook para detectar breakpoint actual y tipo de dispositivo
 * 
 * @returns Objeto con breakpoint actual y helpers booleanos
 * 
 * @example
 * // Placeholder responsive
 * function SearchInput() {
 *   const { isMobile } = useResponsive();
 *   
 *   return (
 *     <input
 *       type="text"
 *       placeholder={isMobile 
 *         ? "Buscar..." 
 *         : "Buscar por código, auditoría, área o responsable..."
 *       }
 *     />
 *   );
 * }
 * 
 * @example
 * // Contenido condicional
 * function Dashboard() {
 *   const { isDesktop, isTouchDevice } = useResponsive();
 *   
 *   return (
 *     <div>
 *       {isDesktop && (
 *         <div className="sidebar">
 *           Sidebar solo desktop
 *         </div>
 *       )}
 *       
 *       {isTouchDevice && (
 *         <p className="text-sm text-gray-600">
 *           💡 Desliza para ver más opciones
 *         </p>
 *       )}
 *     </div>
 *   );
 * }
 * 
 * @example
 * // Lógica de comportamiento
 * function DataTable() {
 *   const { breakpoint } = useResponsive();
 *   
 *   const itemsPerPage = 
 *     breakpoint === 'mobile' ? 5 :
 *     breakpoint === 'tablet' ? 10 :
 *     breakpoint === 'desktop' ? 20 :
 *     50; // 4K
 *   
 *   return <Table items={data} perPage={itemsPerPage} />;
 * }
 * 
 * @example
 * // Labels adaptativos
 * function ActionButton() {
 *   const { isMobile } = useResponsive();
 *   
 *   return (
 *     <TouchButton icon={<Download />}>
 *       {isMobile ? "Exportar" : "Exportar a Excel"}
 *     </TouchButton>
 *   );
 * }
 */
export function useResponsive(): UseResponsiveReturn {
  // Estado inicial: desktop como fallback (SSR safe)
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  
  useEffect(() => {
    /**
     * Función que determina el breakpoint actual basado en window.innerWidth
     */
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else if (width < 2560) {
        setBreakpoint('desktop');
      } else {
        setBreakpoint('4k');
      }
    };
    
    // Ejecutar inmediatamente al montar
    checkBreakpoint();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkBreakpoint);
    
    // Cleanup al desmontar
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  // Calcular helpers booleanos
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';
  const is4K = breakpoint === '4k';
  const isTouchDevice = isMobile || isTablet;
  
  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    is4K,
    isTouchDevice
  };
}

/**
 * Helper para consumir solo el breakpoint actual
 */
export function useBreakpoint(): Breakpoint {
  const { breakpoint } = useResponsive();
  return breakpoint;
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. CASOS DE USO PRINCIPALES:
 * 
 *    A) Placeholders responsive:
 *    const { isMobile } = useResponsive();
 *    placeholder={isMobile ? "Buscar..." : "Buscar por código, nombre, área..."}
 * 
 *    B) Labels de botones:
 *    {isMobile ? "Exportar" : "Exportar a Excel"}
 * 
 *    C) Contenido condicional:
 *    {isDesktop && <Sidebar />}
 *    {isTouchDevice && <TouchHint />}
 * 
 *    D) Lógica de paginación:
 *    const itemsPerPage = isMobile ? 5 : isTablet ? 10 : 20;
 * 
 *    E) Comportamiento de modales:
 *    const modalSize = isMobile ? 'full' : 'lg';
 * 
 * 2. VENTAJAS:
 *    - Detección automática en tiempo real
 *    - No necesita media queries CSS
 *    - Funciona con lógica JavaScript
 *    - Helpers semánticos (isMobile, isTablet)
 *    - Re-render solo cuando cambia breakpoint
 * 
 * 3. CUÁNDO USAR vs CSS:
 * 
 *    USAR HOOK:
 *    - Lógica condicional (if/else)
 *    - Diferentes componentes por breakpoint
 *    - Diferentes datos por breakpoint
 *    - Placeholders, labels, mensajes
 * 
 *    USAR CSS (Tailwind):
 *    - Estilos visuales (colores, tamaños)
 *    - Layout (flex, grid)
 *    - Spacing (padding, margin)
 *    - Visibilidad simple (hidden sm:block)
 * 
 * 4. PERFORMANCE:
 *    - useState previene re-renders innecesarios
 *    - addEventListener limpiado en cleanup
 *    - checkBreakpoint es ligero (solo calcula width)
 *    - No causa layout thrashing
 * 
 * 5. SSR/SSG COMPATIBILITY:
 *    - Estado inicial: 'desktop' (fallback seguro)
 *    - useEffect se ejecuta solo en cliente
 *    - No causa hydration mismatch
 * 
 * 6. TESTING:
 *    - Mock window.innerWidth en tests:
 *      Object.defineProperty(window, 'innerWidth', { value: 320 });
 *    - Simular resize event:
 *      window.dispatchEvent(new Event('resize'));
 *    - Verificar breakpoint correcto para cada width
 * 
 * 7. BREAKPOINTS ALINEADOS CON TAILWIND:
 *    - mobile:  < 640px   (Tailwind: default, sin prefijo)
 *    - tablet:  640-1024  (Tailwind: sm: a lg:)
 *    - desktop: 1024-2560 (Tailwind: lg: a ~4xl:)
 *    - 4k:      ≥ 2560px  (Tailwind: custom)
 * 
 * 8. ALTERNATIVAS:
 *    - window.matchMedia(): Más preciso, más complejo
 *    - react-responsive: Librería externa, más features
 *    - CSS only: No permite lógica JS
 * 
 * 9. EJEMPLO COMPLETO:
 * 
 * function ModuleHeader() {
 *   const { isMobile, isTablet, breakpoint } = useResponsive();
 *   
 *   return (
 *     <ResponsiveHeader>
 *       <div>
 *         <h1 className="text-xl sm:text-2xl font-bold">
 *           {isMobile ? "Auditorías" : "Gestión de Auditorías"}
 *         </h1>
 *         {!isMobile && (
 *           <p className="text-sm text-gray-600">
 *             Administra el ciclo completo de auditorías OCIG
 *           </p>
 *         )}
 *       </div>
 *       
 *       <div className="flex gap-2">
 *         <TouchButton variant="primary" icon={<Plus />}>
 *           {isMobile ? "Crear" : "Crear Auditoría"}
 *         </TouchButton>
 *         
 *         {(isTablet || breakpoint === 'desktop' || breakpoint === '4k') && (
 *           <TouchButton variant="outline" icon={<Download />}>
 *             Exportar
 *           </TouchButton>
 *         )}
 *       </div>
 *     </ResponsiveHeader>
 *   );
 * }
 */
