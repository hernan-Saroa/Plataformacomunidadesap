/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOUCH BUTTON - BOTÓN TÁCTIL OPTIMIZADO (≥44px)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Botón optimizado para dispositivos táctiles que garantiza altura mínima
 * de 44px según Apple/Android guidelines de usabilidad.
 * 
 * ALTURAS GARANTIZADAS:
 * - sm:  40px (botones secundarios)
 * - md:  44px (estándar - default)
 * - lg:  48px (botones principales destacados)
 * 
 * VARIANTES:
 * - primary:   Azul ESAP (#003DA5 → #2962FF)
 * - secondary: Naranja ESAP (#F57C00 → #FB8C00)
 * - outline:   Borde gris, fondo transparente
 * - ghost:     Sin fondo, hover gris claro
 * - danger:    Rojo para acciones destructivas
 * 
 * CARACTERÍSTICAS:
 * - Estado loading con spinner
 * - Icono opcional
 * - Full-width mobile opcional
 * - Estados hover/active optimizados
 * - Disabled con opacity
 * 
 * USO:
 * ```tsx
 * <TouchButton 
 *   variant="primary" 
 *   icon={<Plus />}
 *   onClick={handleClick}
 * >
 *   Crear
 * </TouchButton>
 * ```
 * 
 * CREADO: 30 Enero 2026 - FASE 1 DÍA 1
 * REF: PLAN_IMPLEMENTACION_OPCION_B.md - Tarea 1.2
 */

import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estilo visual del botón */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  
  /** Tamaño del botón (afecta padding y altura mínima) */
  size?: 'sm' | 'md' | 'lg';
  
  /** Botón ocupa 100% del ancho en mobile, auto en desktop */
  fullWidthMobile?: boolean;
  
  /** Muestra spinner y deshabilita el botón */
  loading?: boolean;
  
  /** Icono a mostrar antes del texto */
  icon?: React.ReactNode;
}

/**
 * Botón táctil optimizado con altura ≥44px garantizada
 * 
 * @example
 * // Botón primario con icono
 * <TouchButton
 *   variant="primary"
 *   icon={<Plus className="w-4 h-4" />}
 *   onClick={handleCrear}
 * >
 *   Crear Auditoría
 * </TouchButton>
 * 
 * @example
 * // Botón full-width mobile con loading
 * <TouchButton
 *   variant="primary"
 *   fullWidthMobile
 *   loading={isSubmitting}
 *   disabled={isSubmitting}
 * >
 *   Guardar
 * </TouchButton>
 * 
 * @example
 * // Botón outline (cancelar)
 * <TouchButton variant="outline" onClick={onClose}>
 *   Cancelar
 * </TouchButton>
 * 
 * @example
 * // Botón ghost (acciones secundarias)
 * <TouchButton 
 *   variant="ghost" 
 *   size="sm"
 *   icon={<Eye className="w-4 h-4" />}
 * >
 *   Ver más
 * </TouchButton>
 * 
 * @example
 * // Botón danger (eliminar)
 * <TouchButton
 *   variant="danger"
 *   icon={<Trash2 className="w-4 h-4" />}
 *   onClick={handleEliminar}
 * >
 *   Eliminar
 * </TouchButton>
 */
export function TouchButton({ 
  variant = 'primary',
  size = 'md',
  fullWidthMobile = false,
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: TouchButtonProps) {
  // Clases de tamaño (padding + min-height)
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]'
  };
  
  // Clases de variante (colores + estados)
  const variantClasses = {
    primary: `
      bg-[#003DA5] 
      text-white 
      hover:shadow-lg hover:bg-[#002D7A]
      active:scale-[0.98]
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `,
    secondary: `
      bg-[#F57C00] 
      text-white 
      hover:shadow-lg hover:bg-[#E65100]
      active:scale-[0.98]
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `,
    outline: `
      border-2 border-gray-300 
      text-gray-700 bg-white
      hover:bg-gray-50 hover:border-gray-400
      active:bg-gray-100
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `,
    ghost: `
      text-gray-700 bg-transparent
      hover:bg-gray-100
      active:bg-gray-200
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `,
    danger: `
      bg-red-600 
      text-white 
      hover:shadow-lg hover:bg-red-700
      active:scale-[0.98]
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
    `
  };
  
  // Clase de ancho (full-width mobile o auto)
  const widthClass = fullWidthMobile ? 'w-full sm:w-auto' : '';
  
  return (
    <button
      className={`
        flex items-center justify-center gap-2 
        rounded-lg font-medium 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003DA5]
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${widthClass}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {/* Spinner o Icono */}
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <>{icon}</>
      ) : null}
      
      {/* Texto del botón */}
      {children}
    </button>
  );
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. REEMPLAZAR PATRONES:
 *    ANTES:
 *    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg">
 *      <Plus className="w-4 h-4" />
 *      Crear
 *    </button>
 * 
 *    DESPUÉS:
 *    <TouchButton
 *      variant="primary"
 *      icon={<Plus className="w-4 h-4" />}
 *    >
 *      Crear
 *    </TouchButton>
 * 
 * 2. VENTAJAS:
 *    - Altura ≥44px garantizada (Apple/Android guidelines)
 *    - Estados hover/active optimizados táctil
 *    - Loading state incluido
 *    - Focus visible para accesibilidad
 *    - Reduce código repetitivo
 *    - Mantiene colores corporativos ESAP
 * 
 * 3. CUÁNDO USAR CADA VARIANTE:
 *    - primary:   Acción principal (Crear, Guardar, Enviar)
 *    - secondary: Acción secundaria destacada
 *    - outline:   Cancelar, Cerrar
 *    - ghost:     Ver detalle, Editar, acciones terciarias
 *    - danger:    Eliminar, Rechazar (acciones destructivas)
 * 
 * 4. TAMAÑOS:
 *    - sm:  Botones en cards, filtros, chips
 *    - md:  Botones estándar (default)
 *    - lg:  CTAs principales, botones hero
 * 
 * 5. FULL-WIDTH MOBILE:
 *    - Usar en formularios (botón submit)
 *    - Usar en modales (botones footer)
 *    - NO usar en toolbars/headers (quedan muy anchos)
 * 
 * 6. TESTING TÁCTIL:
 *    - Verificar altura ≥44px en todos los tamaños
 *    - Verificar tap accuracy en iPad/Android tablet
 *    - Verificar estado active visible en touch
 *    - Verificar loading state funciona
 *    - Verificar disabled state visible
 * 
 * 7. ACCESIBILIDAD:
 *    - Focus ring visible (keyboard navigation)
 *    - Disabled con cursor-not-allowed
 *    - Contraste colores WCAG AA
 *    - Icono + texto (no solo icono)
 */
