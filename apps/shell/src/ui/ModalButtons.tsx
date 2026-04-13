import React from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 * MODAL BUTTONS - TOUCH OPTIMIZED
 * ═══════════════════════════════════════════════════════════════
 * 
 * Botones pre-configurados para footers de modales.
 * Touch-friendly (≥44px mobile) y responsive.
 * 
 * @example
 * ```tsx
 * <ResponsiveModal
 *   footer={
 *     <>
 *       <ModalButtonCancel onClick={onClose}>Cancelar</ModalButtonCancel>
 *       <ModalButtonPrimary onClick={handleSave}>Guardar</ModalButtonPrimary>
 *     </>
 *   }
 * >
 *   ...
 * </ResponsiveModal>
 * ```
 */

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface ModalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

// ════════════════════════════════════════════════════════════════
// BASE BUTTON
// ════════════════════════════════════════════════════════════════

const baseButtonClasses = `
  btn-md-mobile
  touch-target
  touch-feedback
  touch-no-select
  px-4 py-2
  rounded-lg
  font-medium
  transition-all duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
  flex items-center justify-center gap-2
  whitespace-nowrap
`;

// ════════════════════════════════════════════════════════════════
// PRIMARY BUTTON (Azul ESAP)
// ════════════════════════════════════════════════════════════════

export function ModalButtonPrimary({
  children,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ModalButtonProps) {
  return (
    <button
      className={`
        ${baseButtonClasses}
        bg-gradient-to-r from-[#2962FF] to-[#003DA5]
        text-white
        hover:shadow-lg hover:shadow-blue-500/30
        active:scale-[0.98]
        ${fullWidth ? 'w-full' : 'min-w-[120px]'}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Procesando...
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// SECONDARY BUTTON (Naranja ESAP)
// ════════════════════════════════════════════════════════════════

export function ModalButtonSecondary({
  children,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ModalButtonProps) {
  return (
    <button
      className={`
        ${baseButtonClasses}
        bg-gradient-to-r from-[#F57C00] to-[#E65100]
        text-white
        hover:shadow-lg hover:shadow-orange-500/30
        active:scale-[0.98]
        ${fullWidth ? 'w-full' : 'min-w-[120px]'}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Procesando...
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// CANCEL BUTTON (Gris)
// ════════════════════════════════════════════════════════════════

export function ModalButtonCancel({
  children,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ModalButtonProps) {
  return (
    <button
      className={`
        ${baseButtonClasses}
        bg-white
        text-gray-700
        border-2 border-gray-300
        hover:bg-gray-50
        hover:border-gray-400
        active:scale-[0.98]
        ${fullWidth ? 'w-full' : 'min-w-[120px]'}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// DANGER BUTTON (Rojo)
// ════════════════════════════════════════════════════════════════

export function ModalButtonDanger({
  children,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ModalButtonProps) {
  return (
    <button
      className={`
        ${baseButtonClasses}
        bg-gradient-to-r from-red-600 to-red-700
        text-white
        hover:shadow-lg hover:shadow-red-500/30
        active:scale-[0.98]
        ${fullWidth ? 'w-full' : 'min-w-[120px]'}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Eliminando...
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// GHOST BUTTON (Transparente)
// ════════════════════════════════════════════════════════════════

export function ModalButtonGhost({
  children,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ModalButtonProps) {
  return (
    <button
      className={`
        ${baseButtonClasses}
        bg-transparent
        text-gray-600
        hover:bg-gray-100
        active:scale-[0.98]
        ${fullWidth ? 'w-full' : 'min-w-[120px]'}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// SUCCESS BUTTON (Verde)
// ════════════════════════════════════════════════════════════════

export function ModalButtonSuccess({
  children,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ModalButtonProps) {
  return (
    <button
      className={`
        ${baseButtonClasses}
        bg-gradient-to-r from-green-600 to-green-700
        text-white
        hover:shadow-lg hover:shadow-green-500/30
        active:scale-[0.98]
        ${fullWidth ? 'w-full' : 'min-w-[120px]'}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Procesando...
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// BUTTON GROUP (Para mobile stack)
// ════════════════════════════════════════════════════════════════

export function ModalButtonGroup({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`
      flex flex-col-reverse gap-2
      sm:flex-row sm:justify-end
      w-full
      ${className}
    `}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export default {
  Primary: ModalButtonPrimary,
  Secondary: ModalButtonSecondary,
  Cancel: ModalButtonCancel,
  Danger: ModalButtonDanger,
  Ghost: ModalButtonGhost,
  Success: ModalButtonSuccess,
  Group: ModalButtonGroup,
};
