/**
 * ContactForm Component
 * 
 * Formulario de contacto accesible con:
 * - Validación en tiempo real
 * - ARIA completo
 * - Microinteracciones
 * - Estados de loading/success/error
 * - Keyboard navigation
 */

import { ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MicrointeractionWrapper } from './MicrointeractionWrapper';
import { LiveRegion } from './LiveRegion';
import { useContactForm, type UseContactFormOptions } from '../../hooks/useContactForm';
import { useAccessibility } from '../../hooks/useAccessibility';
import { motion, AnimatePresence } from 'motion/react';

interface ContactFormProps extends UseContactFormOptions {
  className?: string;
  title?: string;
  showCard?: boolean;
}

export function ContactForm({ 
  className = '',
  title = 'Envíanos un Mensaje',
  showCard = true,
  onSuccess,
  onError,
}: ContactFormProps) {
  const {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useContactForm({ onSuccess, onError });

  const { ariaProps, createId } = useAccessibility();

  // IDs únicos para asociaciones ARIA
  const nameId = createId('contact-name');
  const emailId = createId('contact-email');
  const subjectId = createId('contact-subject');
  const messageId = createId('contact-message');
  const nameErrorId = createId('contact-name-error');
  const emailErrorId = createId('contact-email-error');
  const subjectErrorId = createId('contact-subject-error');
  const messageErrorId = createId('contact-message-error');

  const FormContent = (
    <>
      {/* Live Region para anuncios */}
      <LiveRegion 
        message={
          isSuccess 
            ? 'Mensaje enviado exitosamente' 
            : submitError || ''
        } 
        level="polite"
      />

      <h3 className="text-2xl font-bold text-gray-900 mb-6">{title}</h3>

      {/* Success State */}
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">¡Mensaje Enviado!</h4>
            <p className="text-gray-600 text-lg">
              Gracias por contactarnos. Te responderemos pronto.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
          >
            {/* Error General */}
            {submitError && (
              <MicrointeractionWrapper entranceAnimation="slideUp">
                <div 
                  className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900 mb-1">Error al enviar</h4>
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                </div>
              </MicrointeractionWrapper>
            )}

            {/* Nombre */}
            <div>
              <label 
                htmlFor={nameId}
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Nombre Completo <span className="text-red-600" aria-label="requerido">*</span>
              </label>
              <input
                id={nameId}
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-[#1e5da8]'
                }`}
                placeholder="Tu nombre completo"
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? nameErrorId : undefined}
              />
              {errors.name && (
                <motion.p
                  id={nameErrorId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </motion.p>
              )}
            </div>

            {/* Email */}
            <div>
              <label 
                htmlFor={emailId}
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Correo Electrónico <span className="text-red-600" aria-label="requerido">*</span>
              </label>
              <input
                id={emailId}
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-[#1e5da8]'
                }`}
                placeholder="tucorreo@ejemplo.com"
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? emailErrorId : undefined}
              />
              {errors.email && (
                <motion.p
                  id={emailErrorId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Asunto */}
            <div>
              <label 
                htmlFor={subjectId}
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Asunto <span className="text-red-600" aria-label="requerido">*</span>
              </label>
              <input
                id={subjectId}
                type="text"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                onBlur={() => handleBlur('subject')}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                  errors.subject 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-[#1e5da8]'
                }`}
                placeholder="¿En qué podemos ayudarte?"
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!errors.subject}
                aria-describedby={errors.subject ? subjectErrorId : undefined}
              />
              {errors.subject && (
                <motion.p
                  id={subjectErrorId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.subject}
                </motion.p>
              )}
            </div>

            {/* Mensaje */}
            <div>
              <label 
                htmlFor={messageId}
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Mensaje <span className="text-red-600" aria-label="requerido">*</span>
              </label>
              <textarea
                id={messageId}
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                onBlur={() => handleBlur('message')}
                rows={4}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors resize-none ${
                  errors.message 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-[#1e5da8]'
                }`}
                placeholder="Escribe tu mensaje aquí..."
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? messageErrorId : undefined}
              />
              {errors.message && (
                <motion.p
                  id={messageErrorId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.message}
                </motion.p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {formData.message.length}/1000 caracteres
              </p>
            </div>

            {/* Submit Button */}
            <MicrointeractionWrapper type="button" enableRipple>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#1e5da8] to-blue-600 text-white hover:from-blue-700 hover:to-indigo-700 py-6 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Mensaje
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </MicrointeractionWrapper>

            <p className="text-xs text-center text-gray-500">
              Al enviar este formulario, aceptas nuestros términos y condiciones.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );

  if (!showCard) {
    return <div className={className}>{FormContent}</div>;
  }

  return (
    <Card className={`border-2 border-gray-200 shadow-xl ${className}`}>
      <CardContent className="p-8">
        {FormContent}
      </CardContent>
    </Card>
  );
}
