/**
 * useFormValidation - Hook personalizado para validaciones en tiempo real
 * ✅ Validación reactiva mientras el usuario escribe
 * ✅ Indicadores visuales por campo
 * ✅ Mensajes específicos y descriptivos
 * ✅ Validaciones cruzadas entre campos
 * ✅ Mejora de usabilidad según feedback del usuario
 */

import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, formData?: any) => boolean;
  message: string;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule[];
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export interface TouchedFields {
  [fieldName: string]: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  validationRules: FieldValidation
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  /**
   * Validar un campo individual
   */
  const validateField = useCallback((fieldName: string, value: any): string => {
    const rules = validationRules[fieldName];
    if (!rules) return '';

    for (const rule of rules) {
      // Required
      if (rule.required) {
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          return rule.message;
        }
      }

      // Solo validar el resto si el campo no está vacío
      if (value !== null && value !== undefined && value !== '') {
        // MinLength
        if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
          return rule.message;
        }

        // MaxLength
        if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
          return rule.message;
        }

        // Pattern (regex)
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          return rule.message;
        }

        // Custom validation
        if (rule.custom && !rule.custom(value, formData)) {
          return rule.message;
        }
      }
    }

    return '';
  }, [validationRules, formData]);

  /**
   * Validar todos los campos del formulario
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField, validationRules]);

  /**
   * Actualizar un campo y validarlo en tiempo real
   */
  const updateField = useCallback((fieldName: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validar solo si el campo ya fue tocado
    if (touched[fieldName as string]) {
      const error = validateField(fieldName as string, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  }, [touched, validateField]);

  /**
   * Marcar un campo como tocado (cuando el usuario sale del campo)
   */
  const touchField = useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validar el campo cuando se marca como tocado
    const error = validateField(fieldName as string, formData[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, [formData, validateField]);

  /**
   * Reiniciar el formulario
   */
  const resetForm = useCallback((newData?: Partial<T>) => {
    setFormData(newData ? { ...initialData, ...newData } : initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  /**
   * Obtener el estado visual de un campo
   */
  const getFieldState = useCallback((fieldName: keyof T): 'default' | 'error' | 'success' => {
    if (!touched[fieldName as string]) return 'default';
    if (errors[fieldName as string]) return 'error';
    
    // Si el campo es requerido y tiene valor, mostrar success
    const rules = validationRules[fieldName as string];
    if (rules && rules.some(r => r.required)) {
      const value = formData[fieldName];
      if (value !== null && value !== undefined && value !== '' && 
          (!Array.isArray(value) || value.length > 0)) {
        return 'success';
      }
    }
    
    return 'default';
  }, [touched, errors, formData, validationRules]);

  /**
   * Verificar si el formulario es válido (sin validar)
   */
  const isFormValid = useMemo(() => {
    return Object.keys(validationRules).every(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      return !error;
    });
  }, [formData, validateField, validationRules]);

  /**
   * Contar campos completados
   */
  const completedFields = useMemo(() => {
    return Object.keys(validationRules).filter(fieldName => {
      const value = formData[fieldName];
      return value !== null && value !== undefined && value !== '' && 
             (!Array.isArray(value) || value.length > 0);
    }).length;
  }, [formData, validationRules]);

  const totalFields = Object.keys(validationRules).length;

  return {
    formData,
    errors,
    touched,
    updateField,
    touchField,
    validateForm,
    validateField,
    resetForm,
    getFieldState,
    isFormValid,
    completedFields,
    totalFields
  };
}

/**
 * Validaciones comunes predefinidas
 */
export const CommonValidations = {
  required: (message: string = 'Este campo es obligatorio'): ValidationRule => ({
    required: true,
    message
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Debe tener al menos ${length} caracteres`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `No puede exceder ${length} caracteres`
  }),

  email: (message: string = 'Email inválido'): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message
  }),

  url: (message: string = 'URL inválida'): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message
  }),

  numeric: (message: string = 'Solo se permiten números'): ValidationRule => ({
    pattern: /^\d+$/,
    message
  }),

  alphanumeric: (message: string = 'Solo letras y números'): ValidationRule => ({
    pattern: /^[a-zA-Z0-9]+$/,
    message
  }),

  phone: (message: string = 'Teléfono inválido'): ValidationRule => ({
    pattern: /^[0-9]{7,10}$/,
    message
  }),

  date: (message: string = 'Fecha inválida'): ValidationRule => ({
    custom: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message
  }),

  futureDate: (message: string = 'La fecha debe ser futura'): ValidationRule => ({
    custom: (value) => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    message
  }),

  pastDate: (message: string = 'La fecha debe ser pasada'): ValidationRule => ({
    custom: (value) => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return date <= today;
    },
    message
  }),

  minValue: (min: number, message?: string): ValidationRule => ({
    custom: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number(value) >= min;
    },
    message: message || `El valor mínimo es ${min}`
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    custom: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number(value) <= max;
    },
    message: message || `El valor máximo es ${max}`
  }),

  arrayMinLength: (length: number, message?: string): ValidationRule => ({
    custom: (value) => {
      if (!Array.isArray(value)) return true;
      return value.length >= length;
    },
    message: message || `Debe tener al menos ${length} elemento${length > 1 ? 's' : ''}`
  })
};
