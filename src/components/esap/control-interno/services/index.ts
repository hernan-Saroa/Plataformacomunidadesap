/**
 * PUNTO DE ENTRADA - SERVICIOS CONTROL INTERNO
 * Exporta todos los servicios, tipos y hooks
 */

// Tipos
export * from './types';

// API Services
export * from './api';

// Custom Hooks
export * from './hooks';

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULOS ESPECÍFICOS (Organizados por carpeta)
// ═══════════════════════════════════════════════════════════════════════════

// Plan Anual de Auditoría (5 Roles - Decreto 648/2017)
export * from './plan-anual';

// Re-exportar controlInternoApi como default para facilitar importación
export { controlInternoApi as default } from './api';
