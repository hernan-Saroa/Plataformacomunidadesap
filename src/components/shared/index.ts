/**
 * Shared Components Index
 * 
 * Exporta todos los componentes compartidos del sistema UX Premium
 */

// PWA Components
export { PWAInstallPrompt } from './PWAInstallPrompt';
export { PWAUpdateNotification } from './PWAUpdateNotification';
export { OfflineIndicator } from './OfflineIndicator';

// UX Premium - Microinteracciones
export { MicrointeractionWrapper } from './MicrointeractionWrapper';

// UX Premium - Navegación por Teclado
export { SkipLinks } from './SkipLinks';
export { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

// UX Premium - Accesibilidad ARIA
export { LiveRegion, useLiveRegion } from './LiveRegion';
export { FocusManager } from './FocusManager';

// Search & Navigation
export { GlobalSearch } from './GlobalSearch';
export { GlobalSearchEnhanced } from './GlobalSearchEnhanced';

// Onboarding & Help
export { OnboardingTour } from './OnboardingTour';
export { HelpFloatingButton } from './HelpFloatingButton';
export { WelcomeModal } from './WelcomeModal';
export { InlineTip } from './InlineTip';

// UX Premium Provider (Integra todas las características)
export { UXPremiumProvider, useGlobalAnnounce, DEFAULT_SKIP_LINKS } from './UXPremiumProvider';

// Forms
export { ContactForm } from './ContactForm';

// Navigation
export { StickyNavbar } from './StickyNavbar';

// Pagination
export { PaginationPremium } from './PaginationPremium';

// Error Handling
export { ErrorBoundary } from './ErrorBoundary';
export { ErrorFallbackUI } from './ErrorFallbackUI';
export { LoadingErrorUI } from './LoadingErrorUI';