/**
 * INPUT MEJORADO CON ESTILOS ESAP
 * Versión optimizada del Input con mejor UX y accesibilidad
 */

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface InputEnhancedProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

export const InputEnhanced = forwardRef<HTMLInputElement, InputEnhancedProps>(
  (
    {
      label,
      helper,
      error,
      success = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      variant = 'default',
      type = 'text',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    // Clases base del contenedor
    const containerClasses = `
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `;

    // Clases del wrapper del input
    const wrapperClasses = `
      flex items-center gap-2 transition-all duration-200
      ${variant === 'filled' ? 'bg-gray-100' : 'bg-white'}
      ${variant === 'outlined' ? 'border-2' : 'border'}
      ${error ? 'border-red-500 focus-within:border-red-600' : 
        success ? 'border-green-500 focus-within:border-green-600' :
        isFocused ? 'border-[#003DA5] ring-4 ring-[#003DA5]/10' :
        'border-gray-300 hover:border-gray-400'}
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
      rounded-lg px-3 py-2
    `;

    // Clases del input
    const inputClasses = `
      flex-1 outline-none bg-transparent text-gray-900 placeholder:text-gray-400
      disabled:cursor-not-allowed
      font-normal
    `;

    return (
      <div className={containerClasses}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className={wrapperClasses}>
          {/* Left Icon */}
          {leftIcon && (
            <span className="text-gray-400 flex-shrink-0">
              {leftIcon}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={inputClasses}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {/* Right Icon / Status Icons / Password Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {error && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            {success && !error && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {rightIcon && !isPassword && !error && !success && (
              <span className="text-gray-400">
                {rightIcon}
              </span>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Helper / Error Messages */}
        <AnimatePresence mode="wait">
          {(error || helper) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5"
            >
              {error ? (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ) : helper ? (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {helper}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

InputEnhanced.displayName = 'InputEnhanced';

export default InputEnhanced;
