import type { TourStep } from './GuidedTour';
import { siglDashboardTourSteps } from './tourSteps';

/**
 * Pasos del tour guiado multi-módulo.
 * Por ahora reutilizamos el tour principal del dashboard SIGL
 * para mantener compatibilidad mientras se definen pasos específicos.
 */
export const siglFullTourSteps: TourStep[] = siglDashboardTourSteps;
