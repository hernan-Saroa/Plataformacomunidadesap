/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTAINER 4K - RESPONSIVE PADDING AUTOMÁTICO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Container con padding responsive automático optimizado para todos los 
 * tamaños de pantalla desde mobile (320px) hasta 4K (3840px+).
 * 
 * PADDING AUTOMÁTICO:
 * - Mobile (< 640px):     16px (px-4)
 * - Tablet (640-1024px):  24px (px-6)
 * - Desktop (≥ 1024px):   32px (px-8)
 * 
 * MAX-WIDTH CONFIGURABLE:
 * - '7xl':      1280px (max-w-7xl)
 * - '1600px':   1600px (max-w-[1600px])
 * - '1920px':   1920px (max-w-[1920px]) [DEFAULT]
 * 
 * USO:
 * ```tsx
 * <Container4K className="py-6">
 *   <h1>Mi contenido</h1>
 * </Container4K>
 * ```
 * 
 * CREADO: 30 Enero 2026 - FASE 1 DÍA 1
 * REF: PLAN_IMPLEMENTACION_OPCION_B.md - Tarea 1.2
 */

import React from 'react';

export interface Container4KProps {
  /** Contenido del container */
  children: React.ReactNode;
  
  /** Clases CSS adicionales */
  className?: string;
  
  /** Ancho máximo del container */
  maxWidth?: '7xl' | '1600px' | '1920px';
  
  /** Desactivar padding automático (usar solo si necesitas padding custom) */
  noPadding?: boolean;
}

/**
 * Container responsive optimizado para 4K con padding automático
 * 
 * @example
 * // Uso básico (max-width 1920px, padding responsive)
 * <Container4K className="py-6">
 *   <h1>Contenido</h1>
 * </Container4K>
 * 
 * @example
 * // Max-width personalizado
 * <Container4K maxWidth="7xl" className="py-6">
 *   <h1>Contenido más estrecho</h1>
 * </Container4K>
 * 
 * @example
 * // Sin padding automático (casos especiales)
 * <Container4K noPadding>
 *   <div className="custom-padding">
 *     Padding customizado
 *   </div>
 * </Container4K>
 */
export function Container4K({ 
  children, 
  className = "", 
  maxWidth = '1920px',
  noPadding = false
}: Container4KProps) {
  // Seleccionar clase de max-width
  const maxWidthClass = 
    maxWidth === '7xl' ? 'max-w-7xl' :
    maxWidth === '1600px' ? 'max-w-[1600px]' :
    'max-w-[1920px]';
  
  // Padding responsive (solo si no está desactivado)
  const paddingClass = noPadding ? '' : 'px-4 sm:px-6 lg:px-8';
    
  return (
    <div className={`mx-auto ${paddingClass} ${maxWidthClass} ${className}`}>
      {children}
    </div>
  );
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. REEMPLAZAR PATRONES:
 *    ANTES: <div className="mx-auto px-8 py-6 max-w-[1920px]">
 *    DESPUÉS: <Container4K className="py-6">
 * 
 * 2. VENTAJAS:
 *    - Padding automático mobile/tablet/desktop
 *    - Reduce código repetitivo
 *    - Garantiza consistencia visual
 *    - Fácil mantenimiento (cambio en 1 lugar)
 * 
 * 3. CASOS DE USO:
 *    - Módulos principales: maxWidth="1920px" (default)
 *    - Módulos secundarios: maxWidth="1600px"
 *    - Módulos compactos: maxWidth="7xl" (1280px)
 * 
 * 4. TESTING:
 *    - Verificar padding en 320px, 768px, 1920px
 *    - Verificar max-width no desborda
 *    - Verificar contenido no toca bordes mobile
 */
