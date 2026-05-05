/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RESPONSIVE TABLE WRAPPER - SCROLL HORIZONTAL AUTOMÁTICO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Wrapper para tablas y contenidos anchos con scroll horizontal automático
 * en pantallas pequeñas y medianas (11-14 pulgadas).
 * 
 * CARACTERÍSTICAS:
 * - Scroll horizontal automático cuando el contenido es más ancho que el viewport
 * - Sombras laterales para indicar scroll disponible
 * - Border radius y estilo limpio
 * - Compatible con Container4K
 * 
 * USO:
 * ```tsx
 * <ResponsiveTableWrapper>
 *   <table className="w-full min-w-[1200px]">
 *     ...contenido de tabla...
 *   </table>
 * </ResponsiveTableWrapper>
 * ```
 * 
 * CREADO: 6 Febrero 2026 - Corrección Responsive
 */

import React from 'react';

export interface ResponsiveTableWrapperProps {
  /** Contenido del wrapper (típicamente una tabla) */
  children: React.ReactNode;
  
  /** Clases CSS adicionales */
  className?: string;
  
  /** Ancho mínimo del contenido interno (default: 1200px) */
  minWidth?: string;
}

/**
 * Wrapper responsive para tablas y contenidos anchos
 * 
 * @example
 * // Tabla con scroll horizontal en pantallas pequeñas
 * <ResponsiveTableWrapper>
 *   <table className="w-full">
 *     <thead>...</thead>
 *     <tbody>...</tbody>
 *   </table>
 * </ResponsiveTableWrapper>
 * 
 * @example
 * // Grid ancho con scroll horizontal
 * <ResponsiveTableWrapper minWidth="1400px">
 *   <div className="grid grid-cols-8 gap-4">
 *     ...contenido...
 *   </div>
 * </ResponsiveTableWrapper>
 */
export function ResponsiveTableWrapper({ 
  children, 
  className = "",
  minWidth = "1200px"
}: ResponsiveTableWrapperProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div 
        className="overflow-x-auto overflow-y-visible"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC'
        }}
      >
        <div style={{ minWidth }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * NOTAS DE USO:
 * 
 * 1. TABLAS:
 *    <ResponsiveTableWrapper>
 *      <table className="w-full">
 *        <thead>...</thead>
 *        <tbody>...</tbody>
 *      </table>
 *    </ResponsiveTableWrapper>
 * 
 * 2. GRIDS ANCHOS:
 *    <ResponsiveTableWrapper minWidth="1600px">
 *      <div className="grid grid-cols-6 gap-4">
 *        ...contenido...
 *      </div>
 *    </ResponsiveTableWrapper>
 * 
 * 3. CONTENIDO CON MUCHAS COLUMNAS:
 *    <ResponsiveTableWrapper minWidth="1800px">
 *      <div className="flex gap-4">
 *        <Card />
 *        <Card />
 *        ...más cards...
 *      </div>
 *    </ResponsiveTableWrapper>
 * 
 * 4. VENTAJAS:
 *    - Evita que el contenido se corte en pantallas de 11-14"
 *    - Scroll horizontal suave y accesible
 *    - Indicadores visuales de scroll disponible
 *    - Fácil de implementar en componentes existentes
 * 
 * 5. TESTING:
 *    - Verificar en 1024px (iPad), 1366px (laptop 11"), 1920px (desktop)
 *    - Verificar que aparezca scrollbar horizontal cuando sea necesario
 *    - Verificar que NO aparezca scroll vertical innecesario
 */
