/**
 * Hooks Index
 * 
 * Exporta todos los hooks personalizados
 */

// Auth & Core
export { useAuth } from './useAuth';
export { useRoles } from './useRoles';

// Sistema Usuario Persona V2
export { useEnrollment } from './useEnrollment';
export { useProfileCompleteness } from './useProfileCompleteness';
export { useUserRoles } from './useUserRoles';
export { useNotifications } from './useNotifications';

// React Query Hooks (Optimizados)
export { queryClient, queryKeys } from './useQueryClient';
export * from './useUserQueries';
export * from './usePersonasQueries';
export * from './useAuditQueries';
export * from './useDashboardQueries';

// Responsive & Device Detection
export * from './useResponsive';

// Reports & Analytics
export * from './useReportsQueries';

// PWA
export * from './usePWA';

// Microinteracciones & UX Premium
export { useMicrointeractions } from './useMicrointeractions';

// Navegación por Teclado (Touchless)
export { useKeyboardNavigation, ESAP_GLOBAL_SHORTCUTS, type KeyboardShortcut } from './useKeyboardNavigation';

// Accesibilidad ARIA Completa
export { 
  useAccessibility, 
  useFocusTrap, 
  useFocusRestoration,
  useLiveAnnouncements,
  useAriaDescription,
  useAriaExpanded
} from './useAccessibility';

// Formularios
export { useContactForm, type ContactFormData, type ContactFormErrors, type UseContactFormOptions } from './useContactForm';

// Onboarding & User Experience
export { useFirstVisit } from './useFirstVisit';

// Tips Persistentes
export { usePersistentTip, resetAllTips, getHiddenTipsCount } from './usePersistentTip';