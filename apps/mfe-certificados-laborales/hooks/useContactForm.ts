
/**
 * useContactForm Hook
 * 
 * Hook reutilizable para formularios de contacto con:
 * - Validación completa
 * - Gestión de estado
 * - Accesibilidad ARIA
 * - Feedback UX Premium
 * - Integración con backend (mock por ahora)
 */

import { useState } from 'react';
import { useMicrointeractions } from './useMicrointeractions';
import { useAccessibility } from './useAccessibility';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export interface UseContactFormOptions {
  onSuccess?: (data: ContactFormData) => void;
  onError?: (error: Error) => void;
}

export function useContactForm(options: UseContactFormOptions = {}) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { triggerFeedback } = useMicrointeractions();
  const { announce } = useAccessibility();

  // Validación de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar campo individual
  const validateField = (name: keyof ContactFormData, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        if (value.trim().length > 100) return 'El nombre no puede exceder 100 caracteres';
        return undefined;

      case 'email':
        if (!value.trim()) return 'El correo electrónico es requerido';
        if (!isValidEmail(value)) return 'Por favor ingresa un correo electrónico válido';
        return undefined;

      case 'subject':
        if (!value.trim()) return 'El asunto es requerido';
        if (value.trim().length < 5) return 'El asunto debe tener al menos 5 caracteres';
        if (value.trim().length > 200) return 'El asunto no puede exceder 200 caracteres';
        return undefined;

      case 'message':
        if (!value.trim()) return 'El mensaje es requerido';
        if (value.trim().length < 10) return 'El mensaje debe tener al menos 10 caracteres';
        if (value.trim().length > 1000) return 'El mensaje no puede exceder 1000 caracteres';
        return undefined;

      default:
        return undefined;
    }
  };

  // Validar todo el formulario
  const validateForm = (): boolean => {
    const newErrors: ContactFormErrors = {};

    (Object.keys(formData) as Array<keyof ContactFormData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambio en campo
  const handleChange = (name: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Manejar blur (validar al salir del campo)
  const handleBlur = (name: keyof ContactFormData) => {
    const error = validateField(name, formData[name]);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  // Simular envío a backend (reemplazar con API real)
  const submitToBackend = async (data: ContactFormData): Promise<void> => {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock: 90% success rate
    if (Math.random() > 0.1) {
      console.log('Formulario enviado:', data);
      return Promise.resolve();
    } else {
      throw new Error('Error al enviar el mensaje. Por favor intenta nuevamente.');
    }
  };

  // Enviar formulario
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validar
    if (!validateForm()) {
      triggerFeedback('error', 600);
      announce('Por favor corrige los errores en el formulario', 'assertive');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    triggerFeedback('loading');

    try {
      await submitToBackend(formData);
      
      setIsSuccess(true);
      triggerFeedback('success', 800);
      announce('Mensaje enviado exitosamente. Te contactaremos pronto.', 'polite');

      // Ejecutar callback de éxito
      options.onSuccess?.(formData);

      // Reset form después de 2 segundos
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setSubmitError(errorMessage);
      triggerFeedback('error', 600);
      announce(`Error: ${errorMessage}`, 'assertive');
      
      // Ejecutar callback de error
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    setErrors({});
    setIsSuccess(false);
    setSubmitError(null);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateField,
  };
}
