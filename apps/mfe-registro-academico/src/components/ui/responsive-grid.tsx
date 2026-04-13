/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RESPONSIVE GRID - GRIDS CON BREAKPOINT TABLET
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Grid responsive que incluye breakpoint tablet (sm:) para transiciones
 * suaves entre mobile, tablet y desktop.
 * 
 * CONFIGURACIONES:
 * - cols="2": 1 col mobile → 2 cols tablet/desktop
 * - cols="3": 1 col mobile → 2 cols tablet → 3 cols desktop
 * - cols="4": 2 cols mobile → 2 cols tablet → 4 cols desktop
 * - cols="5": 2 cols mobile → 3 cols tablet → 5 cols desktop
 * 
 * GAP RESPONSIVE:
 * - Mobile:  gap-{value}
 * - Desktop: gap-{value+1}
 * 
 * Ejemplo: gap="4" → gap-4 sm:gap-5 (16px → 20px)
 * 
 * USO:
 * ```tsx
 * <ResponsiveGrid cols="3" gap="4">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </ResponsiveGrid>
 * ```
 * 
 * CREADO: 30 Enero 2026 - FASE 1 DÍA 1
 * REF: PLAN_IMPLEMENTACION_OPCION_B.md - Tarea 1.2
 */

import React from 'react';

export interface ResponsiveGridProps {
  /** Contenido del grid (items) */
  children: React.ReactNode;
  
  /** Número máximo de columnas (mobile se calcula automáticamente) */
  cols?: '2' | '3' | '4' | '5';
  
  /** Espacio entre items (Tailwind gap-{value}) */
  gap?: '3' | '4' | '5' | '6';
  
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Grid responsive con breakpoints mobile → tablet → desktop optimizados
 * 
 * @example
 * // Grid 3 columnas (KPIs, cards)
 * <ResponsiveGrid cols="3" gap="4">
 *   <div className="bg-blue-50 p-4 rounded-lg">
 *     <div className="text-3xl font-bold">42</div>
 *     <div className="text-sm">Total Auditorías</div>
 *   </div>
 *   <div className="bg-green-50 p-4 rounded-lg">
 *     <div className="text-3xl font-bold">15</div>
 *     <div className="text-sm">Completadas</div>
 *   </div>
 *   <div className="bg-orange-50 p-4 rounded-lg">
 *     <div className="text-3xl font-bold">8</div>
 *     <div className="text-sm">En Proceso</div>
 *   </div>
 * </ResponsiveGrid>
 * 
 * @example
 * // Grid 4 columnas (estadísticas rápidas)
 * <ResponsiveGrid cols="4" gap="4" className="mb-6">
 *   <StatCard label="Total" value={100} />
 *   <StatCard label="Pendientes" value={25} />
 *   <StatCard label="En revisión" value={50} />
 *   <StatCard label="Aprobadas" value={25} />
 * </ResponsiveGrid>
 * 
 * @example
 * // Grid 5 columnas (dashboard completo)
 * <ResponsiveGrid cols="5" gap="6">
 *   {expedientes.map(exp => (
 *     <ExpedienteCard key={exp.id} expediente={exp} />
 *   ))}
 * </ResponsiveGrid>
 * 
 * @example
 * // Grid 2 columnas (formulario)
 * <ResponsiveGrid cols="2" gap="4">
 *   <div>
 *     <label>Nombre</label>
 *     <input type="text" />
 *   </div>
 *   <div>
 *     <label>Apellido</label>
 *     <input type="text" />
 *   </div>
 * </ResponsiveGrid>
 */
export function ResponsiveGrid({ 
  children, 
  cols = '3',
  gap = '4',
  className = ""
}: ResponsiveGridProps) {
  // Clases de columnas con breakpoints optimizados
  const colsClasses = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
    '5': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
  };
  
  // Clases de gap responsive (crece ligeramente en desktop)
  const gapClasses = {
    '3': 'gap-3 sm:gap-4',
    '4': 'gap-4 sm:gap-5',
    '5': 'gap-4 sm:gap-6',
    '6': 'gap-5 sm:gap-6'
  };
  
  return (
    <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. REEMPLAZAR PATRONES COMUNES:
 * 
 *    A) Grid sin breakpoint tablet:
 *    ANTES: <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 *    DESPUÉS: <ResponsiveGrid cols="3" gap="6">
 * 
 *    B) Grid con salto brusco:
 *    ANTES: <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 *    DESPUÉS: <ResponsiveGrid cols="4" gap="4">
 * 
 *    C) Grid dashboard complejo:
 *    ANTES: <div className="grid grid-cols-5 gap-4">
 *    DESPUÉS: <ResponsiveGrid cols="5" gap="4">
 * 
 * 2. VENTAJAS:
 *    - Incluye breakpoint tablet (sm:) que faltaba en 80% del código
 *    - Transiciones suaves: 1→2→3 en vez de 1→3
 *    - Gap responsive (más espaciado en desktop)
 *    - Reduce código repetitivo
 *    - Nomenclatura clara (cols indica máximo)
 * 
 * 3. CUÁNDO USAR CADA CONFIGURACIÓN:
 * 
 *    cols="2":
 *    - Formularios (campos lado a lado)
 *    - Comparaciones (antes/después)
 *    - Cards grandes (detalles)
 * 
 *    cols="3":
 *    - KPIs principales (3 métricas)
 *    - Cards de contenido
 *    - Listados de recursos
 * 
 *    cols="4":
 *    - Estadísticas rápidas
 *    - Filtros avanzados
 *    - Miniaturas
 * 
 *    cols="5":
 *    - Dashboards completos
 *    - Galerías
 *    - Grids de expedientes
 * 
 * 4. LÓGICA DE BREAKPOINTS:
 * 
 *    cols="2": Siempre 1 col mobile (muy poco espacio)
 *    cols="3": 1 mobile, 2 tablet (equilibrio), 3 desktop
 *    cols="4": 2 mobile (caben 2 pequeños), 2 tablet, 4 desktop
 *    cols="5": 2 mobile, 3 tablet (mejor que 5 apretados), 5 desktop
 * 
 * 5. GAP RESPONSIVE:
 *    - Mobile: Gap menor (pantalla pequeña)
 *    - Desktop: Gap mayor (pantalla grande, se ve mejor)
 *    - Transición suave (no saltos bruscos)
 * 
 * 6. TESTING:
 *    - 320px (iPhone SE): Verificar 1-2 columnas legibles
 *    - 768px (iPad portrait): Verificar 2-3 columnas optimizado
 *    - 1024px (iPad landscape): Verificar cols máximo funciona
 *    - 1920px (desktop): Verificar no demasiado ancho
 * 
 * 7. CASOS ESPECIALES:
 * 
 *    A) Grid con items variables:
 *    Si algunos items necesitan ocupar más espacio, usar col-span:
 *    
 *    <ResponsiveGrid cols="3">
 *      <div className="col-span-1 sm:col-span-2">
 *        Item destacado (2 columnas en tablet+)
 *      </div>
 *      <div>Item normal</div>
 *    </ResponsiveGrid>
 * 
 *    B) Grid con auto-fit (items dinámicos):
 *    Si no sabes cuántos items tendrás, mejor usar:
 *    
 *    <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
 *      {items.map(...)}
 *    </div>
 * 
 *    C) Grid masonry (heights diferentes):
 *    ResponsiveGrid usa CSS Grid (heights iguales por fila).
 *    Para masonry, usar librería: react-responsive-masonry
 * 
 * 8. ACCESIBILIDAD:
 *    - Orden lógico de lectura (keyboard/screen reader)
 *    - No usar solo para layout visual
 *    - Contenido debe tener sentido en 1 columna mobile
 */
